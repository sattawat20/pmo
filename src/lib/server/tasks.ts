import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { DB } from './db';
import type { SessionUser } from './auth';
import { activityLogs, tasks, TASK_PRIORITIES, TASK_STATUSES, type Task } from './db/schema';
import { diff, logActivity } from './activity';

type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;
const EDITABLE: (keyof TaskPatch)[] = [
	'title',
	'projectId',
	'assigneeId',
	'priority',
	'status',
	'startDate',
	'dueDate',
	'estimatedHours',
	'actualHours',
	'progress',
	'note'
];

export const canEditTask = (user: SessionUser, task: Pick<Task, 'assigneeId'>) =>
	user.role === 'admin' || task.assigneeId === user.id;

/** แปลง FormData เป็น patch ที่ผ่านการตรวจสอบ (เฉพาะฟิลด์ที่ส่งมา) */
export function parseTaskForm(form: FormData): TaskPatch {
	const patch: TaskPatch = {};
	const s = (k: string) => {
		const v = form.get(k);
		return v == null ? undefined : String(v).trim();
	};
	const n = (k: string) => {
		const v = s(k);
		return v === undefined ? undefined : v === '' ? null : Number(v);
	};
	if (s('title') !== undefined) {
		if (!s('title')) error(400, 'กรุณาระบุชื่องาน');
		patch.title = s('title');
	}
	if (s('projectId') !== undefined) patch.projectId = Number(s('projectId'));
	if (s('assigneeId') !== undefined) patch.assigneeId = n('assigneeId');
	if (s('priority') !== undefined) {
		if (!TASK_PRIORITIES.includes(s('priority') as never)) error(400, 'ความสำคัญไม่ถูกต้อง');
		patch.priority = s('priority') as Task['priority'];
	}
	if (s('status') !== undefined) {
		if (!TASK_STATUSES.includes(s('status') as never)) error(400, 'สถานะไม่ถูกต้อง');
		patch.status = s('status') as Task['status'];
	}
	if (s('startDate') !== undefined) patch.startDate = s('startDate') || null;
	if (s('dueDate') !== undefined) patch.dueDate = s('dueDate') || null;
	if (s('estimatedHours') !== undefined) patch.estimatedHours = n('estimatedHours') ?? 0;
	if (s('actualHours') !== undefined) patch.actualHours = n('actualHours') ?? 0;
	if (s('progress') !== undefined) patch.progress = Math.max(0, Math.min(100, n('progress') ?? 0));
	if (s('note') !== undefined) patch.note = s('note') || null;
	return patch;
}

export async function getTask(db: DB, id: number) {
	const [t] = await db.select().from(tasks).where(eq(tasks.id, id));
	if (!t) error(404, 'ไม่พบงานนี้');
	return t;
}

export async function createTask(db: DB, user: SessionUser, patch: TaskPatch) {
	if (!patch.title || !patch.projectId) error(400, 'กรุณาระบุชื่องานและโปรเจกต์');
	// พนักงานสร้างงานได้เฉพาะของตัวเอง
	if (user.role !== 'admin') patch.assigneeId = user.id;
	const [{ max }] = await db
		.select({ max: sql<number>`coalesce(max(cast(substr(${tasks.code}, 3) as integer)), 0)` })
		.from(tasks);
	const code = `T-${String(Number(max) + 1).padStart(3, '0')}`;
	if (patch.status === 'done') patch.progress = 100;
	const [t] = await db
		.insert(tasks)
		.values({ ...patch, title: patch.title, projectId: patch.projectId, code })
		.returning();
	await logActivity(db, {
		userId: user.id,
		entityType: 'task',
		entityId: t.id,
		entityLabel: `${t.code} ${t.title}`,
		action: 'create',
		changes: Object.fromEntries(EDITABLE.filter((k) => t[k] != null).map((k) => [k, [null, t[k]]]))
	});
	return t;
}

export async function updateTask(
	db: DB,
	user: SessionUser,
	id: number,
	patch: TaskPatch,
	action: 'update' | 'revert' = 'update'
) {
	const before = await getTask(db, id);
	if (!canEditTask(user, before)) error(403, 'คุณแก้ไขได้เฉพาะงานของตัวเอง');
	if (user.role !== 'admin') delete patch.assigneeId;
	// เลื่อนเป็น Done → progress 100% อัตโนมัติ
	if (patch.status === 'done' && before.status !== 'done' && patch.progress === undefined) patch.progress = 100;

	const changes = diff(before, patch);
	if (!Object.keys(changes).length) return before;
	const [after] = await db
		.update(tasks)
		.set({ ...patch, updatedAt: new Date() })
		.where(eq(tasks.id, id))
		.returning();
	await logActivity(db, {
		userId: user.id,
		entityType: 'task',
		entityId: id,
		entityLabel: `${after.code} ${after.title}`,
		action,
		changes
	});
	return after;
}

export async function deleteTask(db: DB, user: SessionUser, id: number) {
	const t = await getTask(db, id);
	if (user.role !== 'admin') error(403, 'เฉพาะ Admin เท่านั้นที่ลบงานได้');
	await db.delete(tasks).where(eq(tasks.id, id));
	// เก็บ snapshot ทั้งหมดไว้ใน log เพื่อกู้คืนได้
	await logActivity(db, {
		userId: user.id,
		entityType: 'task',
		entityId: id,
		entityLabel: `${t.code} ${t.title}`,
		action: 'delete',
		changes: Object.fromEntries(
			(['code', ...EDITABLE] as (keyof Task)[]).map((k) => [k, [t[k], null]])
		)
	});
}

/** ย้อนกลับการแก้ไข/การลบงาน จาก activity log */
export async function revertLog(db: DB, user: SessionUser, logId: number) {
	const [log] = await db.select().from(activityLogs).where(eq(activityLogs.id, logId));
	if (!log || log.entityType !== 'task') error(404, 'ไม่พบรายการที่ย้อนกลับได้');
	const changes = log.changes ?? {};
	const restore = Object.fromEntries(
		Object.entries(changes)
			.filter(([k]) => (EDITABLE as string[]).includes(k) || k === 'code')
			.map(([k, [before]]) => [k, before])
	) as TaskPatch & { code?: string };

	if (log.action === 'delete') {
		if (user.role !== 'admin') error(403, 'เฉพาะ Admin เท่านั้นที่กู้คืนงานได้');
		const exists = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, log.entityId));
		if (exists.length) error(400, 'งานนี้ถูกกู้คืนไปแล้ว');
		const [t] = await db
			.insert(tasks)
			.values({ ...restore, id: log.entityId, code: restore.code!, title: restore.title!, projectId: restore.projectId! })
			.returning();
		await logActivity(db, {
			userId: user.id,
			entityType: 'task',
			entityId: t.id,
			entityLabel: `${t.code} ${t.title}`,
			action: 'revert',
			changes: { source: [null, `กู้คืนจากการลบ (log #${log.id})`] }
		});
		return t;
	}
	if (log.action !== 'update' && log.action !== 'revert') error(400, 'รายการนี้ย้อนกลับไม่ได้');
	delete restore.code;
	return updateTask(db, user, log.entityId, restore, 'revert');
}
