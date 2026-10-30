import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`)
};

/** พนักงาน (ชีต "ทีมงาน") — role แยกสิทธิ์ admin / employee */
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'employee'] }).notNull().default('employee'),
	position: text('position'),
	duties: text('duties'),
	level: text('level'),
	startDate: text('start_date'), // YYYY-MM-DD
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	...timestamps
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(), // sha256(token)
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

/** โปรเจกต์ (คอลัมน์ "ลูกค้า / โครงการ") */
export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description'),
	ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
	archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
	...timestamps
});

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** งาน (ชีต "งานทั้งหมด") */
export const tasks = sqliteTable(
	'tasks',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		code: text('code').notNull().unique(), // T-001
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		assigneeId: integer('assignee_id').references(() => users.id, { onDelete: 'set null' }),
		priority: text('priority', { enum: TASK_PRIORITIES }).notNull().default('medium'),
		status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
		startDate: text('start_date'),
		dueDate: text('due_date'),
		estimatedHours: real('estimated_hours').notNull().default(0),
		actualHours: real('actual_hours').notNull().default(0),
		progress: integer('progress').notNull().default(0), // 0-100
		note: text('note'),
		position: integer('position').notNull().default(0), // ลำดับใน Kanban
		...timestamps
	},
	(t) => [index('tasks_assignee_idx').on(t.assigneeId), index('tasks_project_idx').on(t.projectId)]
);

/**
 * Activity Log — บันทึกทุกการเปลี่ยนแปลง
 * changes = { field: [before, after] } ใช้ทั้งแสดงผลและ "ย้อนกลับ"
 */
export const activityLogs = sqliteTable(
	'activity_logs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
		entityType: text('entity_type', { enum: ['task', 'project', 'user'] }).notNull(),
		entityId: integer('entity_id').notNull(),
		entityLabel: text('entity_label'),
		action: text('action', { enum: ['create', 'update', 'delete', 'revert', 'login'] }).notNull(),
		changes: text('changes', { mode: 'json' }).$type<Record<string, [unknown, unknown]>>(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(t) => [index('logs_entity_idx').on(t.entityType, t.entityId), index('logs_created_idx').on(t.createdAt)]
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
