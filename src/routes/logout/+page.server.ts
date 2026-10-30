import { redirect } from '@sveltejs/kit';
import { invalidateSession, SESSION_COOKIE } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await invalidateSession(locals.db, token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
