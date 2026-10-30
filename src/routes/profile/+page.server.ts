import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { users } from '#lib/server/db/schema.js';
import { hashPassword, verifyPassword } from '#lib/server/auth.js';
import { logActivity } from '#lib/server/activity.js';
import type { Actions } from './$types';

export const actions: Actions = {
	password: async ({ request, locals }) => {
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const [u] = await locals.db.select().from(users).where(eq(users.id, locals.user!.id));
		if (!(await verifyPassword(current, u.passwordHash))) return fail(400, { message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
		if (next.length < 6) return fail(400, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
		await locals.db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, u.id));
		await logActivity(locals.db, { userId: u.id, entityType: 'user', entityId: u.id, entityLabel: u.name, action: 'update', changes: { password: ['••••', 'เปลี่ยนเอง'] } });
		return { ok: true };
	}
};
