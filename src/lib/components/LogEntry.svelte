<script lang="ts">
	import { FIELD_LABEL, PRIORITY_LABEL, STATUS_LABEL, fmtDateTime } from '#lib/task-utils.js';
	import type { Snippet } from 'svelte';

	type Log = {
		id: number;
		action: string;
		entityType: string;
		entityId: number;
		entityLabel: string | null;
		changes: Record<string, [unknown, unknown]> | null;
		createdAt: Date;
	};
	let {
		log,
		userName,
		lookup = {},
		actions
	}: {
		log: Log;
		userName: string | null;
		lookup?: { people?: Record<number, string>; projects?: Record<number, string> };
		actions?: Snippet;
	} = $props();

	const ACTION: Record<string, string> = {
		create: 'สร้าง',
		update: 'แก้ไข',
		delete: 'ลบ',
		revert: 'ย้อนกลับ',
		login: 'เข้าสู่ระบบ'
	};
	const ENTITY: Record<string, string> = { task: 'งาน', project: 'โปรเจกต์', user: 'พนักงาน' };
	const HIDDEN = new Set(['passwordHash', 'position_order']);

	function fmt(field: string, v: unknown): string {
		if (v == null || v === '') return '—';
		if (field === 'status') return STATUS_LABEL[v as 'todo'] ?? String(v);
		if (field === 'priority') return PRIORITY_LABEL[v as 'high'] ?? String(v);
		if (field === 'assigneeId' || field === 'ownerId') return lookup.people?.[v as number] ?? `#${v}`;
		if (field === 'projectId') return lookup.projects?.[v as number] ?? `#${v}`;
		if (field === 'progress') return `${v}%`;
		if (typeof v === 'boolean') return v ? 'ใช่' : 'ไม่';
		return String(v);
	}
	const entries = $derived(Object.entries(log.changes ?? {}).filter(([k]) => !HIDDEN.has(k)));
	const href = $derived(
		log.action === 'delete' ? null : log.entityType === 'task' ? `/tasks/${log.entityId}` : log.entityType === 'project' ? `/projects/${log.entityId}` : null
	);
</script>

<div class="flex gap-3 py-3">
	<div class="mt-1.5 size-2 shrink-0 rounded-full {log.action === 'delete' ? 'bg-red-500' : log.action === 'revert' ? 'bg-amber-500' : 'bg-blue-500'}"></div>
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-baseline gap-x-1.5 text-sm">
			<span class="font-medium">{userName ?? 'ระบบ'}</span>
			<span class="text-muted-foreground">{ACTION[log.action]}{log.action !== 'login' ? ENTITY[log.entityType] : ''}</span>
			{#if log.action !== 'login'}
				{#if href}
					<a {href} class="truncate font-medium hover:underline">{log.entityLabel}</a>
				{:else}
					<span class="truncate font-medium">{log.entityLabel}</span>
				{/if}
			{/if}
		</div>
		{#if entries.length && log.action !== 'delete'}
			<ul class="mt-1 space-y-0.5 text-xs text-muted-foreground">
				{#each entries.slice(0, 6) as [field, [before, after]] (field)}
					<li>
						<span class="text-foreground/80">{FIELD_LABEL[field] ?? field}:</span>
						{#if log.action === 'create'}
							{fmt(field, after)}
						{:else}
							<span class="line-through">{fmt(field, before)}</span> → <span class="text-foreground">{fmt(field, after)}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
			<time>{fmtDateTime(log.createdAt)}</time>
			{@render actions?.()}
		</div>
	</div>
</div>
