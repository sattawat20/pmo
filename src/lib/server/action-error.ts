import { fail, isHttpError, isRedirect } from '@sveltejs/kit';

/** รัน action แล้วแปลง error(...) ที่โยนออกมาให้เป็น fail() เพื่อแสดงข้อความในฟอร์ม */
export async function guard<T>(fn: () => Promise<T>) {
	try {
		return await fn();
	} catch (e) {
		if (isRedirect(e)) throw e;
		if (isHttpError(e)) return fail(e.status, { message: e.body.message });
		throw e;
	}
}
