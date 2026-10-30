import { activityLogs } from './db/schema';
import type { DB } from './db';

type EntityType = (typeof activityLogs.$inferInsert)['entityType'];
type Action = (typeof activityLogs.$inferInsert)['action'];

/** เปรียบเทียบค่าก่อน/หลัง คืนเฉพาะฟิลด์ที่เปลี่ยน */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
	const changes: Record<string, [unknown, unknown]> = {};
	for (const key of Object.keys(after)) {
		const a = before[key] ?? null;
		const b = after[key] ?? null;
		if (a instanceof Date || b instanceof Date) continue;
		if (a !== b) changes[key] = [a, b];
	}
	return changes;
}

export async function logActivity(
	db: DB,
	entry: {
		userId: number | null;
		entityType: EntityType;
		entityId: number;
		entityLabel?: string;
		action: Action;
		changes?: Record<string, [unknown, unknown]>;
	}
) {
	await db.insert(activityLogs).values(entry);
}
