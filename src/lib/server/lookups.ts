import { asc, eq } from 'drizzle-orm';
import type { DB } from './db';
import { projects, tasks, users } from './db/schema';

export const listPeople = (db: DB) =>
	db
		.select({ id: users.id, name: users.name, position: users.position, active: users.active, role: users.role })
		.from(users)
		.orderBy(asc(users.id));

export const listProjects = (db: DB) =>
	db
		.select({ id: projects.id, name: projects.name, archived: projects.archived })
		.from(projects)
		.orderBy(asc(projects.id));

/** งานพร้อมชื่อผู้รับผิดชอบและโปรเจกต์ */
export const listTasks = (db: DB) =>
	db
		.select({
			id: tasks.id,
			code: tasks.code,
			title: tasks.title,
			status: tasks.status,
			priority: tasks.priority,
			startDate: tasks.startDate,
			dueDate: tasks.dueDate,
			estimatedHours: tasks.estimatedHours,
			actualHours: tasks.actualHours,
			progress: tasks.progress,
			note: tasks.note,
			position: tasks.position,
			assigneeId: tasks.assigneeId,
			assigneeName: users.name,
			projectId: tasks.projectId,
			projectName: projects.name,
			updatedAt: tasks.updatedAt
		})
		.from(tasks)
		.leftJoin(users, eq(tasks.assigneeId, users.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.orderBy(asc(tasks.position), asc(tasks.code));

export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];
