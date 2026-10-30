import { desc, eq } from 'drizzle-orm';
import { activityLogs, users } from '#lib/server/db/schema.js';
import { listPeople, listTasks, type TaskRow } from '#lib/server/lookups.js';
import { daysLeft, timeStatus, todayISO } from '#lib/task-utils.js';
import type { PageServerLoad } from './$types';

type WatchTask = { code: string; title: string; days: number };

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

/** งานที่ยังไม่เสร็จ แยกตามสัปดาห์ของกำหนดส่ง (เริ่มวันจันทร์) 8 สัปดาห์ข้างหน้า */
function weeklyDue(rows: TaskRow[], today: string) {
	const DAY = 864e5;
	const WEEKS = 8;
	const t = Date.parse(today);
	const monday = t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
	const weeks = Array.from({ length: WEEKS }, (_, i) => ({
		start: new Date(monday + i * 7 * DAY).toISOString().slice(0, 10),
		count: 0
	}));
	let overdue = 0;
	let later = 0;
	for (const r of rows) {
		if (r.status === 'done' || !r.dueDate) continue;
		if (r.dueDate < today) {
			overdue++;
			continue;
		}
		const i = Math.floor((Date.parse(r.dueDate) - monday) / (7 * DAY));
		if (i < WEEKS) weeks[i].count++;
		else later++;
	}
	return { overdue, weeks, later };
}

/** ช่วงเวลาของ heat map: 0 เลยเกิน 3 วัน, 1 เลย 1–3 วัน, 2 เหลือไม่เกิน 3 วัน, 3 เหลือ 4–7 วัน */
function watchBucket(days: number | null) {
	if (days == null || days > 7) return null;
	if (days < -3) return 0;
	if (days < 0) return 1;
	return days <= 3 ? 2 : 3;
}

/** งานที่ต้องเฝ้าระวัง จัดเป็นตาราง กลุ่ม × ช่วงเวลา เรียงกลุ่มที่เสี่ยงที่สุดขึ้นก่อน */
function watchList(rows: TaskRow[], today: string, by: 'person' | 'project') {
	const groups = new Map<number | null, { id: number | null; name: string; cells: WatchTask[][] }>();
	for (const t of rows) {
		if (t.status === 'done') continue;
		const days = daysLeft(t.dueDate, today);
		const bucket = watchBucket(days);
		if (bucket == null) continue;
		const id = by === 'person' ? t.assigneeId : t.projectId;
		const name = by === 'person' ? (t.assigneeName ?? 'ไม่มีผู้รับผิดชอบ') : t.projectName;
		if (!groups.has(id)) groups.set(id, { id, name, cells: [[], [], [], []] });
		groups.get(id)!.cells[bucket].push({ code: t.code, title: t.title, days: days! });
	}
	const risk = (g: { cells: WatchTask[][] }) => g.cells.reduce((sum, c, i) => sum + c.length * (4 - i), 0);
	const list = [...groups.values()].sort((a, b) => risk(b) - risk(a));
	list.forEach((g) => g.cells.forEach((c) => c.sort((a, b) => a.days - b.days)));
	return list;
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

	const recent = await locals.db
		.select({ log: activityLogs, userName: users.name })
		.from(activityLogs)
		.leftJoin(users, eq(activityLogs.userId, users.id))
		.where(isAdmin ? undefined : eq(activityLogs.userId, me.id))
		.orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
		.limit(8);

	return {
		today,
		isAdmin,
		summary: summarize(scope, today),
		weekly: weeklyDue(scope, today),
		people,
		byProject,
		watch: watchList(scope, today, isAdmin ? 'person' : 'project'),
		recent
	};
};
