import { redirect } from '@sveltejs/kit';
import { listPeople, listProjects, listTasks } from '#lib/server/lookups.js';
import { createTask, parseTaskForm } from '#lib/server/tasks.js';
import { guard } from '#lib/server/action-error.js';
import { timeStatus, todayISO } from '#lib/task-utils.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!;
	const today = todayISO();
	const f = {
		assignee: url.searchParams.get('assignee') ?? (me.role === 'admin' ? 'all' : String(me.id)),
		project: url.searchParams.get('project') ?? 'all',
		status: url.searchParams.get('status') ?? 'all',
		time: url.searchParams.get('time') ?? 'all',
		q: url.searchParams.get('q') ?? ''
	};
	const q = f.q.toLowerCase();
	const tasks = (await listTasks(locals.db)).filter(
		(t) =>
			(f.assignee === 'all' || String(t.assigneeId) === f.assignee) &&
			(f.project === 'all' || String(t.projectId) === f.project) &&
			(f.status === 'all' || t.status === f.status) &&
			(f.time === 'all' || timeStatus(t, today) === f.time) &&
			(!q || `${t.code} ${t.title} ${t.note ?? ''}`.toLowerCase().includes(q))
	);
	return {
		tasks,
		filter: f,
		today,
		people: (await listPeople(locals.db)).filter((p) => p.active),
		projects: (await listProjects(locals.db)).filter((p) => !p.archived)
	};
};

export const actions: Actions = {
	create: ({ request, locals }) =>
		guard(async () => {
			const t = await createTask(locals.db, locals.user!, parseTaskForm(await request.formData()));
			redirect(303, `/tasks/${t.id}`);
		})
};
