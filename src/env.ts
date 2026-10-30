import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	// ใช้เฉพาะบนเครื่อง local (ไฟล์ SQLite) — บน Cloudflare ใช้ D1 binding "DB" จึงไม่ต้องตั้งค่า
	DATABASE_URL: { description: 'The database connection string.', schema: (v) => v }
});
