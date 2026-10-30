import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getDb } from '#lib/server/db/index.js';
import { SESSION_COOKIE, validateSession } from '#lib/server/auth.js';

const PUBLIC_PATHS = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb(event.platform);
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? await validateSession(event.locals.db, token) : null;
	if (token && !event.locals.user) event.cookies.delete(SESSION_COOKIE, { path: '/' });

	const path = event.url.pathname;
	if (!event.locals.user && !PUBLIC_PATHS.includes(path)) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(path)}`);
	}
	if (path.startsWith('/admin') && event.locals.user?.role !== 'admin') {
		redirect(303, '/');
	}

	return resolve(event);
};
