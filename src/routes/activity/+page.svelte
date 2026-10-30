<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import * as Card from '#lib/components/ui/card/index.js';
	import Undo from '@lucide/svelte/icons/undo-2';
	import FilterSelect from '#lib/components/FilterSelect.svelte';
	import LogEntry from '#lib/components/LogEntry.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const user = $derived(page.data.user!);

	function pageHref(n: number) {
		const u = new URL(page.url.href);
		u.searchParams.set('page', String(n));
		return u.pathname + u.search;
	}
	// ย้อนกลับได้: การแก้ไขงาน (ผู้รับผิดชอบ/Admin ตรวจสิทธิ์ฝั่ง server) และการลบงาน (Admin)
	const canRevert = (a: string, type: string) =>
		type === 'task' && (a === 'update' || a === 'revert' || (a === 'delete' && user.role === 'admin'));
</script>

<svelte:head><title>ประวัติ · PMO</title></svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">Activity Log</h1>
		<p class="text-sm text-muted-foreground">ประวัติทั้งหมด {data.total} รายการ — ใครแก้อะไรเมื่อไร</p>
	</div>
	<div class="flex flex-wrap gap-3">
		<FilterSelect name="user" label="ผู้แก้ไข" value={data.filter.user}
			options={[{ value: 'all', label: 'ทุกคน' }, ...data.people.map((p) => ({ value: String(p.id), label: p.name }))]} />
		<FilterSelect name="type" label="ประเภท" value={data.filter.type}
			options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'task', label: 'งาน' }, { value: 'project', label: 'โปรเจกต์' }, { value: 'user', label: 'พนักงาน' }]} />
		<FilterSelect name="action" label="การกระทำ" value={data.filter.action}
			options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'create', label: 'สร้าง' }, { value: 'update', label: 'แก้ไข' }, { value: 'delete', label: 'ลบ' }, { value: 'revert', label: 'ย้อนกลับ' }, { value: 'login', label: 'เข้าสู่ระบบ' }]} />
	</div>
</div>

<Card.Root class="py-0">
	<Card.Content class="divide-y">
		{#each data.logs as r (r.log.id)}
			<LogEntry log={r.log} userName={r.userName} lookup={data.lookup}>
				{#snippet actions()}
					{#if canRevert(r.log.action, r.log.entityType)}
						<form
							method="POST"
							action="?/revert"
							use:enhance={() => async ({ result, update }) => {
								if (result.type === 'success') toast.success('ย้อนกลับแล้ว');
								else if (result.type === 'failure') toast.error(String(result.data?.message));
								await update();
							}}
						>
							<input type="hidden" name="logId" value={r.log.id} />
							<button type="submit" class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 hover:bg-muted">
								<Undo class="size-3" /> {r.log.action === 'delete' ? 'กู้คืน' : 'ย้อนกลับ'}
							</button>
						</form>
					{/if}
				{/snippet}
			</LogEntry>
		{:else}
			<p class="py-10 text-center text-muted-foreground">ไม่มีประวัติ</p>
		{/each}
	</Card.Content>
</Card.Root>

{#if data.pages > 1}
	<nav class="mt-4 flex items-center justify-center gap-2 text-sm">
		{#if data.page > 1}<a class="rounded-full border px-3 py-1 hover:bg-muted" href={pageHref(data.page - 1)}>← ก่อนหน้า</a>{/if}
		<span class="text-muted-foreground">หน้า {data.page} / {data.pages}</span>
		{#if data.page < data.pages}<a class="rounded-full border px-3 py-1 hover:bg-muted" href={pageHref(data.page + 1)}>ถัดไป →</a>{/if}
	</nav>
{/if}
