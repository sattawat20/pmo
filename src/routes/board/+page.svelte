<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import FilterSelect from '#lib/components/FilterSelect.svelte';
	import TimeBadge from '#lib/components/TimeBadge.svelte';
	import { PRIORITY_LABEL, STATUSES, STATUS_COLOR, STATUS_LABEL, STATUS_TH, fmtDate, type Status } from '#lib/task-utils.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// สถานะที่ย้ายแล้วแต่ server ยังไม่ตอบ (optimistic update)
	let pending = $state<Record<number, Status>>({});
	const tasks = $derived(data.tasks.map((t) => (pending[t.id] ? { ...t, status: pending[t.id] } : t)));
	let dragId = $state<number | null>(null);
	let overCol = $state<Status | null>(null);

	const user = $derived(page.data.user!);
	const canMove = (assigneeId: number | null) => user.role === 'admin' || assigneeId === user.id;

	async function move(id: number, status: Status) {
		const t = tasks.find((x) => x.id === id);
		if (!t || t.status === status) return;
		if (!canMove(t.assigneeId)) {
			toast.error('คุณย้ายได้เฉพาะงานของตัวเอง');
			return;
		}
		pending[id] = status;
		const body = new FormData();
		body.set('id', String(id));
		body.set('status', status);
		const res = deserialize(await (await fetch('?/move', { method: 'POST', body })).text());
		if (res.type === 'success') {
			toast.success(`${t.code} → ${STATUS_LABEL[status]}`);
			await invalidateAll();
		} else {
			toast.error(res.type === 'failure' ? String(res.data?.message) : 'อัปเดตไม่สำเร็จ');
		}
		delete pending[id];
	}

	const priorityClass = { high: 'bg-red-50 text-red-700', medium: 'bg-secondary text-secondary-foreground', low: 'bg-muted text-muted-foreground' };
</script>

<svelte:head><title>Kanban · PMO</title></svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">Kanban Board</h1>
		<p class="text-sm text-muted-foreground">ลากการ์ดไปคอลัมน์อื่นเพื่ออัปเดตสถานะ — ทุกการย้ายถูกบันทึกในประวัติ</p>
	</div>
	<div class="flex flex-wrap gap-3">
		<FilterSelect
			name="assignee"
			label="ผู้รับผิดชอบ"
			value={data.filter.assignee}
			options={[{ value: 'all', label: 'ทุกคน' }, ...data.people.map((p) => ({ value: String(p.id), label: p.name }))]}
		/>
		<FilterSelect
			name="project"
			label="โปรเจกต์"
			value={data.filter.project}
			options={[{ value: 'all', label: 'ทั้งหมด' }, ...data.projects.map((p) => ({ value: String(p.id), label: p.name }))]}
		/>
	</div>
</div>

<div class="grid gap-4 md:grid-cols-3">
	{#each STATUSES as col (col)}
		{@const items = tasks.filter((t) => t.status === col)}
		<section
			class="flex min-h-[60vh] flex-col rounded-3xl border bg-muted/40 p-3 transition-colors {overCol === col ? 'border-primary/40 bg-secondary' : ''}"
			ondragover={(e) => {
				e.preventDefault();
				overCol = col;
			}}
			ondragleave={() => (overCol = null)}
			ondrop={(e) => {
				e.preventDefault();
				overCol = null;
				if (dragId != null) move(dragId, col);
				dragId = null;
			}}
			aria-label="คอลัมน์ {STATUS_LABEL[col]}"
		>
			<header class="mb-3 flex items-center gap-2 px-1">
				<span class="size-2.5 rounded-full" style="background:{STATUS_COLOR[col]}"></span>
				<h2 class="font-semibold">{STATUS_LABEL[col]}</h2>
				<span class="text-xs text-muted-foreground">{STATUS_TH[col]}</span>
				<span class="ml-auto rounded-full bg-background px-2 text-xs tabular-nums">{items.length}</span>
			</header>
			<div class="flex flex-1 flex-col gap-2">
				{#each items as t (t.id)}
					{@const movable = canMove(t.assigneeId)}
					<article
						draggable={movable}
						ondragstart={(e) => {
							dragId = t.id;
							e.dataTransfer?.setData('text/plain', String(t.id));
						}}
						ondragend={() => (dragId = null)}
						class="group rounded-2xl border bg-card p-3 shadow-xs transition {movable ? 'cursor-grab active:cursor-grabbing' : 'opacity-80'} {dragId === t.id ? 'opacity-40' : ''}"
					>
						<div class="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
							<span class="font-mono">{t.code}</span>
							<span class="truncate">· {t.projectName}</span>
							<span class="ml-auto rounded-full px-2 py-0.5 {priorityClass[t.priority]}">{PRIORITY_LABEL[t.priority]}</span>
						</div>
						<a href="/tasks/{t.id}" class="block text-sm font-medium leading-snug hover:underline">{t.title}</a>
						{#if t.progress > 0 && t.status !== 'done'}
							<div class="mt-2 h-1.5 rounded-full bg-muted">
								<div class="h-full rounded-full" style="width:{t.progress}%;background:{STATUS_COLOR.doing}"></div>
							</div>
						{/if}
						<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span class="font-medium text-foreground/80">{t.assigneeName ?? '—'}</span>
							<span>กำหนด {fmtDate(t.dueDate)}</span>
							<TimeBadge status={t.status} dueDate={t.dueDate} today={data.today} />
						</div>
						<!-- ปุ่มย้ายสำหรับคีย์บอร์ด/มือถือ (แทนการลาก) -->
						{#if movable}
							<div class="mt-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
								{#each STATUSES.filter((s) => s !== col) as s (s)}
									<button
										type="button"
										class="rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
										onclick={() => move(t.id, s)}>→ {STATUS_LABEL[s]}</button
									>
								{/each}
							</div>
						{/if}
					</article>
				{:else}
					<p class="px-1 py-6 text-center text-sm text-muted-foreground">ไม่มีงาน</p>
				{/each}
			</div>
		</section>
	{/each}
</div>
