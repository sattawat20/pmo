/**
 * นำเข้าข้อมูลเริ่มต้นจากไฟล์ Excel (project_tracking_sample.xlsx)
 *
 *   npm run db:seed                      # ใช้ไฟล์ data/project_tracking_sample.xlsx
 *   npm run db:seed -- path/to/file.xlsx
 *
 * ล้างข้อมูลเดิมทั้งหมดแล้วนำเข้าใหม่ (ใช้สำหรับเครื่อง dev)
 */
import 'dotenv/config';
import ExcelJS from 'exceljs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../src/lib/server/db/schema';
import { hashPassword } from '../src/lib/server/auth';

const { users, projects, tasks, activityLogs, sessions } = schema;

/** รหัสผ่านเริ่มต้นของทุกบัญชีที่นำเข้า (เปลี่ยนได้ในหน้า Admin) */
export const DEFAULT_PASSWORD = 'pmo1234';

const STATUS_MAP: Record<string, schema.TaskStatus> = {
	ยังไม่เริ่ม: 'todo',
	กำลังดำเนินการ: 'doing',
	รอตรวจ: 'doing',
	ระงับ: 'doing',
	เสร็จแล้ว: 'done'
};
const PRIORITY_MAP: Record<string, schema.TaskPriority> = { สูง: 'high', กลาง: 'medium', ต่ำ: 'low' };

const file = process.argv[2] ?? 'data/project_tracking_sample.xlsx';
const url = process.env.DATABASE_URL ?? 'file:local.db';

// อ่านค่าเซลล์: รองรับสูตร (ใช้ผลลัพธ์), rich text และวันที่
function cell(row: ExcelJS.Row, col: number): string | number | Date | null {
	const v = row.getCell(col).value as unknown;
	if (v == null || v === '') return null;
	if (typeof v === 'object' && !(v instanceof Date)) {
		const o = v as { result?: unknown; richText?: { text: string }[] };
		if (o.richText) return o.richText.map((t) => t.text).join('');
		return (o.result as string | number | null) ?? null;
	}
	return v as string | number | Date;
}
const str = (row: ExcelJS.Row, col: number) => {
	const v = cell(row, col);
	return v == null ? null : String(v).trim();
};
const date = (row: ExcelJS.Row, col: number) => {
	const v = cell(row, col);
	return v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : null;
};
const num = (row: ExcelJS.Row, col: number) => Number(cell(row, col) ?? 0) || 0;

/** หาแถวหัวตาราง แล้ววนแถวข้อมูลที่อยู่ถัดไปจนกว่าจะเจอแถวว่าง */
function dataRows(ws: ExcelJS.Worksheet, firstHeader: string) {
	let header = 0;
	ws.eachRow((r, i) => {
		if (!header && str(r, 1) === firstHeader) header = i;
	});
	if (!header) throw new Error(`ไม่พบหัวตาราง "${firstHeader}" ในชีต ${ws.name}`);
	const rows: ExcelJS.Row[] = [];
	for (let i = header + 1; i <= ws.rowCount; i++) {
		const r = ws.getRow(i);
		if (!str(r, 1)) break;
		rows.push(r);
	}
	return rows;
}

async function main() {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(file);
	const teamSheet = wb.getWorksheet('ทีมงาน');
	const taskSheet = wb.getWorksheet('งานทั้งหมด');
	if (!teamSheet || !taskSheet) throw new Error('ไฟล์ต้องมีชีต "ทีมงาน" และ "งานทั้งหมด"');

	const db = drizzle(createClient({ url }), { schema });
	await migrate(db, { migrationsFolder: 'drizzle' });

	await db.delete(activityLogs);
	await db.delete(sessions);
	await db.delete(tasks);
	await db.delete(projects);
	await db.delete(users);

	// ── ทีมงาน: ลำดับ | ชื่อ | ตำแหน่ง | หน้าที่หลัก | อีเมล | วันเริ่มงาน | ระดับ
	const passwordHash = await hashPassword(DEFAULT_PASSWORD);
	const userByName = new Map<string, number>();
	let adminId = 0;
	for (const r of dataRows(teamSheet, 'ลำดับ')) {
		const position = str(r, 3);
		const isLead = /หัวหน้า|lead/i.test(position ?? '');
		const [u] = await db
			.insert(users)
			.values({
				name: str(r, 2)!,
				position,
				duties: str(r, 4),
				email: str(r, 5)!.toLowerCase(),
				startDate: date(r, 6),
				level: str(r, 7),
				role: isLead ? 'admin' : 'employee',
				passwordHash
			})
			.returning();
		userByName.set(u.name, u.id);
		if (isLead && !adminId) adminId = u.id;
	}

	// ── งานทั้งหมด: รหัสงาน | ลูกค้า/โครงการ | ชื่องาน | ผู้รับผิดชอบ | ความสำคัญ | สถานะ | วันเริ่ม
	//    | กำหนดเสร็จ | ชม.ประเมิน | ชม.จริง | %ความคืบหน้า | วันคงเหลือ* | สถานะเวลา* | หมายเหตุ
	//    (* คอลัมน์คำนวณ — ระบบคำนวณเองจากกำหนดเสร็จ จึงไม่นำเข้า)
	const projectByName = new Map<string, number>();
	let count = 0;
	for (const r of dataRows(taskSheet, 'รหัสงาน')) {
		const projectName = str(r, 2) ?? 'ไม่ระบุโครงการ';
		if (!projectByName.has(projectName)) {
			const [p] = await db
				.insert(projects)
				.values({ name: projectName, ownerId: adminId || null })
				.returning();
			projectByName.set(projectName, p.id);
			await db.insert(activityLogs).values({
				userId: adminId || null,
				entityType: 'project',
				entityId: p.id,
				entityLabel: p.name,
				action: 'create',
				changes: { source: [null, 'นำเข้าจาก Excel'] }
			});
		}

		const rawStatus = str(r, 6) ?? 'ยังไม่เริ่ม';
		const status = STATUS_MAP[rawStatus] ?? 'todo';
		// สถานะที่ไม่มีใน To do/Doing/Done (รอตรวจ, ระงับ) เก็บไว้ในหมายเหตุ ไม่ให้ข้อมูลหาย
		const flag = rawStatus === 'รอตรวจ' || rawStatus === 'ระงับ' ? `[${rawStatus}]` : null;
		const note = [flag, str(r, 14)].filter(Boolean).join(' ');
		const assignee = str(r, 4);
		const [t] = await db
			.insert(tasks)
			.values({
				code: str(r, 1)!,
				projectId: projectByName.get(projectName)!,
				title: str(r, 3)!,
				assigneeId: assignee ? (userByName.get(assignee) ?? null) : null,
				priority: PRIORITY_MAP[str(r, 5) ?? ''] ?? 'medium',
				status,
				startDate: date(r, 7),
				dueDate: date(r, 8),
				estimatedHours: num(r, 9),
				actualHours: num(r, 10),
				progress: Math.round(num(r, 11) * 100),
				note: note || null,
				position: count
			})
			.returning();
		await db.insert(activityLogs).values({
			userId: adminId || null,
			entityType: 'task',
			entityId: t.id,
			entityLabel: `${t.code} ${t.title}`,
			action: 'create',
			changes: { source: [null, 'นำเข้าจาก Excel'], status: [null, rawStatus] }
		});
		count++;
	}

	console.log(`นำเข้าสำเร็จ: พนักงาน ${userByName.size} คน, โปรเจกต์ ${projectByName.size}, งาน ${count} งาน`);
	console.log(`รหัสผ่านเริ่มต้นทุกบัญชี: ${DEFAULT_PASSWORD}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
