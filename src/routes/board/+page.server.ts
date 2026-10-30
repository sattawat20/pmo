import { fail } from '@sveltejs/kit';
import { listPeople, listProjects, listTasks } from '#lib/server/lookups.js';
import { updateTask } from '#lib/server/tasks.js';
import { todayISO } from '#lib/task-utils.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!;
	// พนักงานเห็นงานของตัวเองเป็นค่าเริ่มต้น, admin เห็นทั้งหมด
	const assignee = url.searchParams.get('assignee') ?? (me.role === 'admin' ? 'all' : String(me.id));
	const project = url.searchParams.get('project') ?? 'all';
	const all = await listTasks(locals.db);
	const tasks = all.filter(
		(t) =>
			(assignee === 'all' || String(t.assigneeId) === assignee) &&
			(project === 'all' || String(t.projectId) === project)
	);
	return {
		tasks,
		people: (await listPeople(locals.db)).filter((p) => p.active),
		projects: (await listProjects(locals.db)).filter((p) => !p.archived),
		filter: { assignee, project },
		today: todayISO()
	};
};

export const actions: Actions = {
	move: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const status = String(form.get('status'));
		if (!['todo', 'doing', 'done'].includes(status)) return fail(400, { message: 'สถานะไม่ถูกต้อง' });
		try {
			await updateTask(locals.db, locals.user!, id, { status: status as 'todo' });
		} catch (e) {
			const err = e as { status?: number; body?: { message: string } };
			return fail(err.status ?? 500, { message: err.body?.message ?? 'อัปเดตไม่สำเร็จ' });
		}
		return { ok: true };
	}
};
