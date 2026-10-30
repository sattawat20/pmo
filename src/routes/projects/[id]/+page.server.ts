import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { projects } from '#lib/server/db/schema.js';
import { listTasks } from '#lib/server/lookups.js';
import { deleteProject, updateProject } from '#lib/server/projects.js';
import { guard } from '#lib/server/action-error.js';
import { todayISO } from '#lib/task-utils.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const id = Number(params.id);
	const [project] = await locals.db.select().from(projects).where(eq(projects.id, id));
	if (!project) error(404, 'ไม่พบโปรเจกต์');
	const tasks = (await listTasks(locals.db)).filter((t) => t.projectId === id);
	return { project, tasks, today: todayISO() };
};

export const actions: Actions = {
	update: ({ request, locals, params }) =>
		guard(async () => {
			await updateProject(locals.db, locals.user!, Number(params.id), await request.formData());
			return { saved: true };
		}),
	delete: ({ locals, params }) =>
		guard(async () => {
			await deleteProject(locals.db, locals.user!, Number(params.id));
			redirect(303, '/projects');
		})
};
