import { redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { activityLogs, projects, users } from '#lib/server/db/schema.js';
import { listPeople, listProjects } from '#lib/server/lookups.js';
import { canEditTask, deleteTask, getTask, parseTaskForm, revertLog, updateTask } from '#lib/server/tasks.js';
import { guard } from '#lib/server/action-error.js';
import { todayISO } from '#lib/task-utils.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const task = await getTask(locals.db, Number(params.id));
	const [project] = await locals.db.select().from(projects).where(eq(projects.id, task.projectId));
	const history = await locals.db
		.select({ log: activityLogs, userName: users.name })
		.from(activityLogs)
		.leftJoin(users, eq(activityLogs.userId, users.id))
		.where(and(eq(activityLogs.entityType, 'task'), eq(activityLogs.entityId, task.id)))
		.orderBy(desc(activityLogs.createdAt), desc(activityLogs.id));
	const people = await listPeople(locals.db);
	const projectList = await listProjects(locals.db);
	return {
		task,
		project,
		history,
		canEdit: canEditTask(locals.user!, task),
		people: people.filter((p) => p.active || p.id === task.assigneeId),
		projects: projectList,
		lookup: {
			people: Object.fromEntries(people.map((p) => [p.id, p.name])),
			projects: Object.fromEntries(projectList.map((p) => [p.id, p.name]))
		},
		today: todayISO()
	};
};

export const actions: Actions = {
	update: ({ request, locals, params }) =>
		guard(async () => {
			await updateTask(locals.db, locals.user!, Number(params.id), parseTaskForm(await request.formData()));
			return { saved: true };
		}),
	delete: ({ locals, params }) =>
		guard(async () => {
			await deleteTask(locals.db, locals.user!, Number(params.id));
			redirect(303, '/tasks');
		}),
	revert: ({ request, locals }) =>
		guard(async () => {
			const form = await request.formData();
			await revertLog(locals.db, locals.user!, Number(form.get('logId')));
			return { reverted: true };
		})
};
