import { desc, eq } from 'drizzle-orm';
import { activityLogs, users } from '#lib/server/db/schema.js';
import { listPeople, listTasks, type TaskRow } from '#lib/server/lookups.js';
import { timeStatus, todayISO } from '#lib/task-utils.js';
import type { PageServerLoad } from './$types';

function summarize(rows: TaskRow[], today: string) {
	const s = { total: 0, todo: 0, doing: 0, done: 0, overdue: 0, dueSoon: 0, est: 0, actual: 0 };
	for (const t of rows) {
		s.total++;
		s[t.status]++;
		const ts = timeStatus(t, today);
		if (ts === 'overdue') s.overdue++;
		if (ts === 'due-soon') s.dueSoon++;
		s.est += t.estimatedHours;
		s.actual += t.actualHours;
	}
	return { ...s, rate: s.total ? s.done / s.total : 0 };
}

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!;
	const isAdmin = me.role === 'admin';
	const today = todayISO();
	const all = await listTasks(locals.db);
	const scope = isAdmin ? all : all.filter((t) => t.assigneeId === me.id);

	const people = isAdmin
		? (await listPeople(locals.db))
				.filter((p) => p.active)
				.map((p) => ({ ...p, ...summarize(all.filter((t) => t.assigneeId === p.id), today) }))
		: [];

	const projectNames = [...new Map(scope.map((t) => [t.projectId, t.projectName])).entries()];
	const byProject = projectNames.map(([id, name]) => {
		const rows = scope.filter((t) => t.projectId === id);
		return { id, name, ...summarize(rows, today), avgProgress: rows.reduce((a, t) => a + t.progress, 0) / (rows.length || 1) };
	});

	const late = scope
		.filter((t) => ['overdue', 'due-soon'].includes(timeStatus(t, today)))
		.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

	const recent = await locals.db
		.select({ log: activityLogs, userName: users.name })
		.from(activityLogs)
		.leftJoin(users, eq(activityLogs.userId, users.id))
		.where(isAdmin ? undefined : eq(activityLogs.userId, me.id))
		.orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
		.limit(8);

	return { today, isAdmin, summary: summarize(scope, today), people, byProject, late, recent };
};
