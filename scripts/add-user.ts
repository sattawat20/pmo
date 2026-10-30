/**
 * เพิ่มผู้ใช้ลง Cloudflare D1 โดยพิมพ์รหัสผ่านเองใน terminal (ไม่แสดงบนจอ ไม่เก็บเป็นข้อความธรรมดา)
 *
 *   npm run user:add -- <email> <ชื่อ> [admin|employee]
 */
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashPassword } from '../src/lib/server/auth';

const DB_NAME = 'pmo-tracker-db';
const [emailArg, name, roleArg = 'employee'] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
if (!email?.includes('@') || !name || !['admin', 'employee'].includes(roleArg)) {
	console.error('ใช้งาน: npm run user:add -- <email> <ชื่อ> [admin|employee]');
	process.exit(1);
}

/** อ่านรหัสผ่านจากคีย์บอร์ดโดยไม่แสดงตัวอักษร */
function askHidden(prompt: string) {
	return new Promise<string>((done, fail) => {
		const { stdin, stdout } = process;
		if (!stdin.isTTY) return fail(new Error('ต้องรันใน terminal ที่พิมพ์ได้'));
		stdout.write(prompt);
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');
		let value = '';
		const onData = (chunk: string) => {
			for (const ch of chunk) {
				if (ch === '\r' || ch === '\n') {
					stdin.setRawMode(false);
					stdin.pause();
					stdin.off('data', onData);
					stdout.write('\n');
					return done(value);
				}
				if (ch === '\u0003') process.exit(130); // Ctrl-C
				if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
				else value += ch;
			}
		};
		stdin.on('data', onData);
	});
}

const sql = (v: string) => `'${v.replace(/'/g, "''")}'`;

async function main() {
	const password = await askHidden(`ตั้งรหัสผ่านสำหรับ ${email}: `);
	if (password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
	if (password !== (await askHidden('พิมพ์รหัสผ่านอีกครั้ง: '))) throw new Error('รหัสผ่านไม่ตรงกัน');

	const hash = await hashPassword(password);
	const changes = JSON.stringify({ name: [null, name], email: [null, email], role: [null, roleArg] });
	const file = resolve('.wrangler', `add-user-${Date.now()}.sql`);
	writeFileSync(
		file,
		`INSERT INTO users (name, email, password_hash, role) VALUES (${sql(name)}, ${sql(email)}, ${sql(hash)}, ${sql(roleArg)});\n` +
			`INSERT INTO activity_logs (entity_type, entity_id, entity_label, action, changes) ` +
			`SELECT 'user', id, name, 'create', ${sql(changes)} FROM users WHERE email = ${sql(email)};\n`
	);
	try {
		const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
		execFileSync(process.execPath, [wrangler, 'd1', 'execute', DB_NAME, '--remote', '--file', file, '--yes'], {
			stdio: 'inherit'
		});
		console.log(`เพิ่มบัญชี ${email} (${roleArg}) แล้ว`);
	} finally {
		rmSync(file, { force: true });
	}
}

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
