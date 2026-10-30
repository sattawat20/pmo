// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { DB } from '#lib/server/db/index.js';
import type { SessionUser } from '#lib/server/auth.js';

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties
		}

		interface Locals {
			db: DB;
			user: SessionUser | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
