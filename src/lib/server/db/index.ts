import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

// ทั้ง libsql (เครื่อง local) และ D1 (Cloudflare) เป็น async SQLite จึงใช้ type ร่วมกันได้
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = BaseSQLiteDatabase<'async', any, typeof schema>;

let localDb: DB | undefined;

/**
 * เลือก database ตาม environment:
 * - Cloudflare Pages: ใช้ D1 binding ชื่อ `DB` (ตั้งใน wrangler.jsonc)
 * - เครื่อง local: ใช้ไฟล์ SQLite ตาม DATABASE_URL (เช่น file:local.db)
 */
export function getDb(platform?: App.Platform): DB {
	const d1 = (platform?.env as { DB?: D1Database } | undefined)?.DB;
	if (d1) return drizzleD1(d1, { schema }) as unknown as DB;

	if (!localDb) {
		if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
		localDb = drizzleLibsql(createClient({ url: DATABASE_URL }), { schema }) as unknown as DB;
	}
	return localDb;
}

export { schema };
