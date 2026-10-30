import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { users } from '#lib/server/db/schema.js';
import { createSession, verifyPassword } from '#lib/server/auth.js';
import { logActivity } from '#lib/server/activity.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		const [user] = await locals.db.select().from(users).where(eq(users.email, email));
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, { email, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
		}
		if (!user.active) return fail(403, { email, message: 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อ Admin' });

		await createSession(locals.db, user.id, cookies);
		await logActivity(locals.db, {
			userId: user.id,
			entityType: 'user',
			entityId: user.id,
			entityLabel: user.name,
			action: 'login'
		});
		const to = url.searchParams.get('redirectTo');
		redirect(303, to?.startsWith('/') && !to.startsWith('//') ? to : '/');
	}
};
