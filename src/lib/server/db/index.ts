import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { createClient } from '@libsql/client';
import { env } from 'cloudflare:workers';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

// ทั้ง libsql (เครื่อง local) และ D1 (Cloudflare) เป็น async SQLite จึงใช้ type ร่วมกันได้
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = BaseSQLiteDatabase<'async', any, typeof schema>;

let localDb: DB | undefined;

/**
 * เลือก database ตาม environment:
 * - เครื่อง local: มี DATABASE_URL ใน .env → ใช้ไฟล์ SQLite (file:local.db)
 * - Cloudflare Workers: ไม่มี DATABASE_URL → ใช้ D1 binding ชื่อ `DB` (ตั้งใน wrangler.jsonc)
 */
export function getDb(): DB {
	if (DATABASE_URL) {
		localDb ??= drizzleLibsql(createClient({ url: DATABASE_URL }), { schema }) as unknown as DB;
		return localDb;
	}
	if (!env.DB) throw new Error('ไม่พบ D1 binding "DB" และไม่ได้ตั้ง DATABASE_URL');
	return drizzleD1(env.DB, { schema }) as unknown as DB;
}

export { schema };
