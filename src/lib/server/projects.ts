import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { DB } from './db';
import type { SessionUser } from './auth';
import { projects, tasks } from './db/schema';
import { diff, logActivity } from './activity';

const requireAdmin = (user: SessionUser) => {
	if (user.role !== 'admin') error(403, 'เฉพาะ Admin เท่านั้น');
};

export function parseProjectForm(form: FormData) {
	const name = String(form.get('name') ?? '').trim();
	if (!name) error(400, 'กรุณาระบุชื่อโปรเจกต์');
	return {
		name,
		description: String(form.get('description') ?? '').trim() || null,
		archived: form.get('archived') === 'on'
	};
}

export async function createProject(db: DB, user: SessionUser, form: FormData) {
	requireAdmin(user);
	const values = parseProjectForm(form);
	const [dup] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, values.name));
	if (dup) error(400, 'มีโปรเจกต์ชื่อนี้แล้ว');
	const [p] = await db.insert(projects).values({ ...values, ownerId: user.id }).returning();
	await logActivity(db, {
		userId: user.id,
		entityType: 'project',
		entityId: p.id,
		entityLabel: p.name,
		action: 'create',
		changes: { name: [null, p.name], description: [null, p.description] }
	});
	return p;
}

export async function updateProject(db: DB, user: SessionUser, id: number, form: FormData) {
	requireAdmin(user);
	const [before] = await db.select().from(projects).where(eq(projects.id, id));
	if (!before) error(404, 'ไม่พบโปรเจกต์');
	const values = parseProjectForm(form);
	const changes = diff(before, values);
	if (!Object.keys(changes).length) return;
	await db.update(projects).set({ ...values, updatedAt: new Date() }).where(eq(projects.id, id));
	await logActivity(db, { userId: user.id, entityType: 'project', entityId: id, entityLabel: values.name, action: 'update', changes });
}

export async function deleteProject(db: DB, user: SessionUser, id: number) {
	requireAdmin(user);
	const [p] = await db.select().from(projects).where(eq(projects.id, id));
	if (!p) error(404, 'ไม่พบโปรเจกต์');
	const used = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, id)).limit(1);
	if (used.length) error(400, 'ลบไม่ได้เพราะยังมีงานในโปรเจกต์ — ให้ "เก็บถาวร" แทน หรือลบงานก่อน');
	await db.delete(projects).where(eq(projects.id, id));
	await logActivity(db, { userId: user.id, entityType: 'project', entityId: id, entityLabel: p.name, action: 'delete' });
}
