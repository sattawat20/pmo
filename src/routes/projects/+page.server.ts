import { redirect } from '@sveltejs/kit';
import { projects } from '#lib/server/db/schema.js';
import { listTasks } from '#lib/server/lookups.js';
import { createProject } from '#lib/server/projects.js';
import { guard } from '#lib/server/action-error.js';
import { timeStatus, todayISO } from '#lib/task-utils.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const today = todayISO();
	const all = await locals.db.select().from(projects).orderBy(projects.archived, projects.id);
	const tasks = await listTasks(locals.db);
	return {
		projects: all.map((p) => {
			const rows = tasks.filter((t) => t.projectId === p.id);
			const c = { todo: 0, doing: 0, done: 0 };
			rows.forEach((t) => c[t.status]++);
			return {
				...p,
				...c,
				total: rows.length,
				overdue: rows.filter((t) => timeStatus(t, today) === 'overdue').length,
				members: [...new Set(rows.map((t) => t.assigneeName).filter(Boolean))],
				lastDue: rows.map((t) => t.dueDate ?? '').sort().at(-1) || null
			};
		})
	};
};

export const actions: Actions = {
	create: ({ request, locals }) =>
		guard(async () => {
			const p = await createProject(locals.db, locals.user!, await request.formData());
			redirect(303, `/projects/${p.id}`);
		})
};
