/**
 * Export ข้อมูลจากฐานข้อมูล local (SQLite) เป็นไฟล์ SQL สำหรับนำเข้า Cloudflare D1
 *
 *   npm run db:export -- out.sql
 *   npx wrangler d1 execute pmo-tracker-db --remote --file out.sql
 *
 * ใช้หลังจาก apply migration บน D1 แล้ว (ไฟล์นี้มีเฉพาะข้อมูล ไม่มี CREATE TABLE)
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@libsql/client';

const out = process.argv[2] ?? 'seed-d1.sql';
const db = createClient({ url: process.env.DATABASE_URL ?? 'file:local.db' });

// เรียงตาม foreign key: users → projects → tasks → activity_logs (ไม่ export sessions)
const TABLES = ['users', 'projects', 'tasks', 'activity_logs'];

const lit = (v: unknown) =>
	v == null ? 'NULL' : typeof v === 'number' || typeof v === 'bigint' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

const lines: string[] = [];
for (const t of [...TABLES].reverse()) lines.push(`DELETE FROM ${t};`);
for (const t of TABLES) {
	const { rows, columns } = await db.execute(`SELECT * FROM ${t}`);
	for (const r of rows) {
		lines.push(`INSERT INTO ${t} (${columns.join(', ')}) VALUES (${columns.map((c) => lit(r[c])).join(', ')});`);
	}
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(`เขียน ${lines.length} คำสั่งลง ${out}`);
