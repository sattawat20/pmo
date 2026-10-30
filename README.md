# PMO — ระบบติดตามงานทีม

Web App แทนการส่งไฟล์ Excel ทาง LINE: ข้อมูลอยู่ที่เดียว ทุกคน Login ด้วยบัญชีของตัวเอง
หัวหน้าเห็น Dashboard แบบ real-time และทุกการแก้ไขถูกบันทึกพร้อมย้อนกลับได้

**ธีม:** ตาม CI มหาวิทยาลัยมหาสารคาม: Campus Green `#00824C`, เหลือง มมส `#FFCD22`, Cloud Dancer `#F0EEE9`, เทาเข้ม `#333333` (token อยู่ใน [src/routes/layout.css](src/routes/layout.css)) หัวเรื่องใช้ **Anuphan** และเนื้อความใช้ **Noto Sans Thai Looped** (ฟอนต์ฟรี SIL OFL โหลดจากแพ็กเกจ @fontsource)

**Stack:** SvelteKit 3 (SSR) · Tailwind 4 · shadcn-svelte · Drizzle ORM · SQLite (libsql) → Cloudflare D1 · Cloudflare Pages

## เริ่มใช้งานบนเครื่อง

```bash
npm install
npm run setup     # สร้าง migration + นำเข้าข้อมูลจาก data/project_tracking_sample.xlsx
npm run dev       # http://localhost:5173
```

| บัญชีตัวอย่าง | สิทธิ์ |
|---|---|
| `vipa@example.com` (วิภา — หัวหน้าทีม) | Admin |
| อีเมลอื่นในชีต "ทีมงาน" เช่น `napa@example.com` | พนักงาน |

รหัสผ่านเริ่มต้นทุกบัญชีคือค่า `DEFAULT_PASSWORD` ใน [scripts/seed.ts](scripts/seed.ts) — เปลี่ยนได้ที่หน้าโปรไฟล์ หรือ Admin ตั้งใหม่ให้ที่หน้า "พนักงาน"

นำเข้าไฟล์ Excel อื่น (ล้างข้อมูลเดิม): `npm run db:seed -- path/to/file.xlsx`

## ฟีเจอร์

| หน้า | รายละเอียด |
|---|---|
| Dashboard `/` | KPI รวม, สรุปรายคน (Admin), สรุปรายโปรเจกต์, งานที่เกินกำหนด/ใกล้ครบกำหนด, ความเคลื่อนไหวล่าสุด |
| Kanban `/board` | ลากการ์ดระหว่าง To do / Doing / Done (หรือกดปุ่ม → บนการ์ด) กรองตามคน/โปรเจกต์ |
| งาน `/tasks` | ตาราง + ค้นหา + กรองสถานะ/เวลา, เพิ่มงาน, หน้ารายละเอียดแก้ไขได้ พร้อมประวัติของงานนั้น |
| โปรเจกต์ `/projects` | ความคืบหน้าแต่ละโปรเจกต์, Admin เพิ่ม/แก้/เก็บถาวร/ลบ |
| ประวัติ `/activity` | Activity Log ทั้งระบบ กรองตามคน/ประเภท/การกระทำ, ปุ่ม "ย้อนกลับ" และ "กู้คืน" งานที่ถูกลบ |
| พนักงาน `/admin/users` | Admin เพิ่ม / แก้ไข / ปิดการใช้งาน / ลบ, ตั้งรหัสผ่านใหม่ |

**สิทธิ์:** Admin ทำได้ทุกอย่าง · พนักงานแก้ไข/ย้ายได้เฉพาะงานที่ตัวเองรับผิดชอบ สร้างงานให้ตัวเองได้ ดูงานและประวัติของทั้งทีมได้ (ตรวจสิทธิ์ฝั่ง server ทุก action)

## โครงสร้างไฟล์

```
data/project_tracking_sample.xlsx   ไฟล์ต้นฉบับสำหรับ seed
drizzle/                            SQL migration (ใช้ทั้ง SQLite local และ D1)
scripts/seed.ts                     อ่าน Excel → users / projects / tasks / activity_logs
src/
  hooks.server.ts                   เลือก DB, ตรวจ session, กันหน้าที่ต้อง login และ /admin
  lib/
    task-utils.ts                   ป้ายสถานะ สี และสูตร "เกินกำหนด/ใกล้ครบกำหนด" (ใช้ร่วม client/server)
    components/                     StatusBar, TimeBadge, TaskForm, LogEntry, FilterSelect
    components/ui/                  shadcn-svelte
    server/
      db/schema.ts                  ตาราง users, sessions, projects, tasks, activity_logs
      db/index.ts                   getDb(): libsql ไฟล์ local.db บนเครื่อง / D1 binding บน Cloudflare
      auth.ts                       PBKDF2 + session cookie (Web Crypto — รันได้ทั้ง Node และ Workers)
      tasks.ts / projects.ts        สร้าง/แก้/ลบ + ตรวจสิทธิ์ + เขียน log + ย้อนกลับ
      activity.ts                   diff ก่อน/หลัง และบันทึก activity log
      lookups.ts                    query รายการงาน/คน/โปรเจกต์
  routes/                           login, logout, / (dashboard), board, tasks, projects, activity, admin/users, profile
```

### การแปลงข้อมูลจาก Excel

| ชีต Excel | ตาราง | หมายเหตุ |
|---|---|---|
| ทีมงาน | `users` | ตำแหน่งที่มีคำว่า "หัวหน้า" → Admin |
| งานทั้งหมด › ลูกค้า / โครงการ | `projects` | 1 ชื่อ = 1 โปรเจกต์ |
| งานทั้งหมด | `tasks` | สถานะ: ยังไม่เริ่ม→To do, กำลังดำเนินการ/รอตรวจ/ระงับ→Doing, เสร็จแล้ว→Done (รอตรวจ/ระงับ ใส่ไว้ในหมายเหตุ) |
| คอลัมน์ วันคงเหลือ, สถานะเวลา, ชีต ภาพรวม | — | เป็นค่าคำนวณ ระบบคำนวณสดจากกำหนดส่งแทน |

## Deploy บน Cloudflare Workers + D1

ใช้งานอยู่ที่ https://pmo-tracker.sattawat-th.workers.dev (Worker `pmo-tracker`, D1 `pmo-tracker-db`)

```bash
npx wrangler login       # ครั้งแรกครั้งเดียว
npm run deploy           # build แล้ว deploy
```

เมื่อแก้ schema: `npm run db:generate` แล้ว `npm run db:migrate:remote`

นำข้อมูลจาก local ขึ้น D1 (**ล้างข้อมูลบน D1 ก่อนนำเข้า**):

```bash
npm run db:export -- out.sql
npx wrangler d1 execute pmo-tracker-db --remote --file out.sql
```

`getDb()` เลือกฐานข้อมูลเอง: มี `DATABASE_URL` ใน `.env` ใช้ไฟล์ SQLite บนเครื่อง ไม่มีใช้ D1 binding `DB` จาก `cloudflare:workers`

> ⚠️ รหัสผ่านเริ่มต้นอยู่ใน repo นี้ ต้องเปลี่ยนรหัสผ่านทุกบัญชีก่อนใช้งานจริงบนเว็บสาธารณะ
