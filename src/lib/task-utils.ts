// ใช้ได้ทั้งฝั่ง server และ client
export type Status = 'todo' | 'doing' | 'done';
export type Priority = 'high' | 'medium' | 'low';

export const STATUS_LABEL: Record<Status, string> = { todo: 'To do', doing: 'Doing', done: 'Done' };
export const STATUS_TH: Record<Status, string> = { todo: 'ยังไม่เริ่ม', doing: 'กำลังทำ', done: 'เสร็จแล้ว' };
export const PRIORITY_LABEL: Record<Priority, string> = { high: 'สูง', medium: 'กลาง', low: 'ต่ำ' };
export const STATUSES: Status[] = ['todo', 'doing', 'done'];
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

// ลำดับสถานะเป็น ordinal จึงใช้เขียว Campus Green ไล่ระดับเดียว (อ่อน→เข้ม) ส่วน "เกินกำหนด" ใช้สีสถานะ critical
export const STATUS_COLOR: Record<Status, string> = { todo: '#b3dbc6', doing: '#2f9e69', done: '#005a34' };
export const OVERDUE_COLOR = '#d03b3b';
export const DUE_SOON_COLOR = '#c98500';

/** วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayISO() {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

export function daysLeft(dueDate: string | null, today = todayISO()) {
	if (!dueDate) return null;
	return Math.round((Date.parse(dueDate) - Date.parse(today)) / 864e5);
}

export type TimeStatus = 'done' | 'overdue' | 'due-soon' | 'normal' | 'none';

/** เหมือนสูตรใน Excel: เกินกำหนด = ยังไม่เสร็จและเลยกำหนด / ใกล้ครบกำหนด = เหลือไม่เกิน 3 วัน */
export function timeStatus(t: { status: Status; dueDate: string | null }, today = todayISO()): TimeStatus {
	if (t.status === 'done') return 'done';
	const d = daysLeft(t.dueDate, today);
	if (d == null) return 'none';
	if (d < 0) return 'overdue';
	if (d <= 3) return 'due-soon';
	return 'normal';
}

export const TIME_STATUS_LABEL: Record<TimeStatus, string> = {
	done: 'เสร็จแล้ว',
	overdue: 'เกินกำหนด',
	'due-soon': 'ใกล้ครบกำหนด',
	normal: 'ปกติ',
	none: '-'
};

const thDate = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
const thDateTime = new Intl.DateTimeFormat('th-TH', {
	day: 'numeric',
	month: 'short',
	year: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'Asia/Bangkok'
});
export const fmtDate = (d: string | null) => (d ? thDate.format(new Date(d)) : '-');
export const fmtDateTime = (d: Date | string | number) => thDateTime.format(new Date(d));

export const FIELD_LABEL: Record<string, string> = {
	title: 'ชื่องาน',
	code: 'รหัสงาน',
	status: 'สถานะ',
	priority: 'ความสำคัญ',
	assigneeId: 'ผู้รับผิดชอบ',
	projectId: 'โปรเจกต์',
	startDate: 'วันเริ่ม',
	dueDate: 'กำหนดส่ง',
	estimatedHours: 'ชม.ประเมิน',
	actualHours: 'ชม.จริง',
	progress: '% ความคืบหน้า',
	note: 'หมายเหตุ',
	name: 'ชื่อ',
	email: 'อีเมล',
	role: 'สิทธิ์',
	position: 'ตำแหน่ง',
	duties: 'หน้าที่',
	level: 'ระดับ',
	active: 'ใช้งาน',
	description: 'รายละเอียด',
	archived: 'เก็บถาวร',
	password: 'รหัสผ่าน',
	source: 'ที่มา'
};
