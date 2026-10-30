import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import type { DB } from './db';
import { sessions, users } from './db/schema';

// ใช้ Web Crypto ล้วน เพื่อให้รันได้ทั้ง Node และ Cloudflare Workers
const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;
const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'pmo_session';

const toHex = (buf: ArrayBuffer | Uint8Array) =>
	[...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
	return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

export async function hashPassword(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
	return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [, iter, saltHex, hashHex] = stored.split('$');
	const hash = toHex(await pbkdf2(password, fromHex(saltHex), Number(iter)));
	// constant-time compare
	let diff = hash.length ^ hashHex.length;
	for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashHex.charCodeAt(i);
	return diff === 0;
}

const sha256 = async (s: string) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

export async function createSession(db: DB, userId: number, cookies: Cookies) {
	const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
	await db.insert(sessions).values({ id: await sha256(token), userId, expiresAt });
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', expires: expiresAt });
}

export async function validateSession(db: DB, token: string) {
	const id = await sha256(token);
	const [row] = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id));
	if (!row) return null;
	if (row.session.expiresAt.getTime() < Date.now() || !row.user.active) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	const { passwordHash: _, ...user } = row.user;
	return user;
}

export async function invalidateSession(db: DB, token: string) {
	await db.delete(sessions).where(eq(sessions.id, await sha256(token)));
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof validateSession>>>;
