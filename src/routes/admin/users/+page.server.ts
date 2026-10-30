import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, ne } from 'drizzle-orm';
import { sessions, tasks, users } from '#lib/server/db/schema.js';
import { hashPassword } from '#lib/server/auth.js';
import { diff, logActivity } from '#lib/server/activity.js';
import { guard } from '#lib/server/action-error.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await locals.db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			position: users.position,
			duties: users.duties,
			level: users.level,
			startDate: users.startDate,
			active: users.active
		})
		.from(users)
		.orderBy(asc(users.id));
	const taskRows = await locals.db.select({ assigneeId: tasks.assigneeId, status: tasks.status }).from(tasks);
	return {
		users: rows.map((u) => ({
			...u,
			open: taskRows.filter((t) => t.assigneeId === u.id && t.status !== 'done').length
		}))
	};
};

function parse(form: FormData) {
	const s = (k: string) => String(form.get(k) ?? '').trim();
	const values = {
		name: s('name'),
		email: s('email').toLowerCase(),
		role: (s('role') === 'admin' ? 'admin' : 'employee') as 'admin' | 'employee',
		position: s('position') || null,
		duties: s('duties') || null,
		level: s('level') || null,
		startDate: s('startDate') || null,
		active: form.get('active') === 'on'
	};
	if (!values.name || !values.email) error(400, 'กรุณาระบุชื่อและอีเมล');
	return { values, password: s('password') };
}

async function emailTaken(db: App.Locals['db'], email: string, exceptId = 0) {
	const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), ne(users.id, exceptId)));
	return !!u;
}

export const actions: Actions = {
	create: ({ request, locals }) =>
		guard(async () => {
			const { values, password } = parse(await request.formData());
			if (password.length < 6) return fail(400, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
			if (await emailTaken(locals.db, values.email)) return fail(400, { message: 'อีเมลนี้มีผู้ใช้แล้ว' });
			const [u] = await locals.db
				.insert(users)
				.values({ ...values, passwordHash: await hashPassword(password) })
				.returning();
			await logActivity(locals.db, {
				userId: locals.user!.id,
				entityType: 'user',
				entityId: u.id,
				entityLabel: u.name,
				action: 'create',
				changes: { name: [null, u.name], email: [null, u.email], role: [null, u.role], position: [null, u.position] }
			});
			return { ok: true };
		}),

	update: ({ request, locals }) =>
		guard(async () => {
			const form = await request.formData();
			const id = Number(form.get('id'));
			const { values, password } = parse(form);
			const [before] = await locals.db.select().from(users).where(eq(users.id, id));
			if (!before) return fail(404, { message: 'ไม่พบพนักงาน' });
			if (id === locals.user!.id && (values.role !== 'admin' || !values.active)) {
				return fail(400, { message: 'ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตัวเองได้' });
			}
			if (await emailTaken(locals.db, values.email, id)) return fail(400, { message: 'อีเมลนี้มีผู้ใช้แล้ว' });
			if (password && password.length < 6) return fail(400, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });

			const changes = diff(before, values);
			const patch = { ...values, updatedAt: new Date(), ...(password ? { passwordHash: await hashPassword(password) } : {}) };
			await locals.db.update(users).set(patch).where(eq(users.id, id));
			if (password) changes.password = ['••••', 'ตั้งใหม่'];
			// ปิดบัญชีหรือเปลี่ยนรหัสผ่าน → บังคับออกจากระบบทุกเครื่อง
			if (!values.active || password) await locals.db.delete(sessions).where(eq(sessions.userId, id));
			if (Object.keys(changes).length) {
				await logActivity(locals.db, { userId: locals.user!.id, entityType: 'user', entityId: id, entityLabel: values.name, action: 'update', changes });
			}
			return { ok: true };
		}),

	delete: ({ request, locals }) =>
		guard(async () => {
			const id = Number((await request.formData()).get('id'));
			if (id === locals.user!.id) return fail(400, { message: 'ไม่สามารถลบบัญชีของตัวเองได้' });
			const [u] = await locals.db.select().from(users).where(eq(users.id, id));
			if (!u) return fail(404, { message: 'ไม่พบพนักงาน' });
			// งานที่ค้างอยู่จะกลายเป็น "ไม่มีผู้รับผิดชอบ" (FK on delete set null)
			await locals.db.delete(users).where(eq(users.id, id));
			await logActivity(locals.db, {
				userId: locals.user!.id,
				entityType: 'user',
				entityId: id,
				entityLabel: u.name,
				action: 'delete',
				changes: { name: [u.name, null], email: [u.email, null], position: [u.position, null] }
			});
			return { ok: true };
		})
};
