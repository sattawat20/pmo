import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { activityLogs, users } from '#lib/server/db/schema.js';
import { listPeople, listProjects } from '#lib/server/lookups.js';
import { revertLog } from '#lib/server/tasks.js';
import { guard } from '#lib/server/action-error.js';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 40;

export const load: PageServerLoad = async ({ locals, url }) => {
	const f = {
		user: url.searchParams.get('user') ?? 'all',
		type: url.searchParams.get('type') ?? 'all',
		action: url.searchParams.get('action') ?? 'all'
	};
	const pageNo = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const where: SQL[] = [];
	if (f.user !== 'all') where.push(eq(activityLogs.userId, Number(f.user)));
	if (f.type !== 'all') where.push(eq(activityLogs.entityType, f.type as 'task'));
	if (f.action !== 'all') where.push(eq(activityLogs.action, f.action as 'update'));
	const cond = where.length ? and(...where) : undefined;

	const [{ total }] = await locals.db.select({ total: count() }).from(activityLogs).where(cond);
	const logs = await locals.db
		.select({ log: activityLogs, userName: users.name })
		.from(activityLogs)
		.leftJoin(users, eq(activityLogs.userId, users.id))
		.where(cond)
		.orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
		.limit(PAGE_SIZE)
		.offset((pageNo - 1) * PAGE_SIZE);

	const people = await listPeople(locals.db);
	const projects = await listProjects(locals.db);
	return {
		logs,
		filter: f,
		page: pageNo,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		total,
		people,
		lookup: {
			people: Object.fromEntries(people.map((p) => [p.id, p.name])),
			projects: Object.fromEntries(projects.map((p) => [p.id, p.name]))
		}
	};
};

export const actions: Actions = {
	revert: ({ request, locals }) =>
		guard(async () => {
			const form = await request.formData();
			await revertLog(locals.db, locals.user!, Number(form.get('logId')));
			return { reverted: true };
		})
};
