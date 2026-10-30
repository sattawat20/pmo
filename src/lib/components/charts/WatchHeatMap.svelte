<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { tip } from '#lib/chart-tip.js';

	type Task = { code: string; title: string; days: number };
	type Row = { id: number | null; name: string; cells: Task[][] };
	let { rows, by }: { rows: Row[]; by: 'person' | 'project' } = $props();

	const RED = ['#f6d3d3', '#e58a8a', '#d03b3b'];
	const AMBER = ['#fdeec4', '#f8d376', '#e8a917'];
	const COLUMNS = [
		{ label: 'เลยเกิน 3 วัน', ramp: RED, time: 'overdue-long' },
		{ label: 'เลย 1–3 วัน', ramp: RED, time: 'overdue-recent' },
		{ label: 'เหลือ 0–3 วัน', ramp: AMBER, time: 'due-soon' },
		{ label: 'เหลือ 4–7 วัน', ramp: AMBER, time: 'due-week' }
	];

	// ความเข้มตามจำนวนงาน: 1, 2, 3 งานขึ้นไป
	const shade = (ramp: string[], n: number) => ramp[Math.min(n, ramp.length) - 1];
	const textOn = (color: string) => (color === RED[2] ? '#ffffff' : '#333333');
	const when = (d: number) => (d < 0 ? `เลย ${-d} วัน` : d === 0 ? 'ครบวันนี้' : `เหลือ ${d} วัน`);

	function hint(row: Row, tasks: Task[]) {
		const lines = tasks.slice(0, 5).map((t) => `${t.code} ${t.title} (${when(t.days)})`);
		if (tasks.length > 5) lines.push(`และอีก ${tasks.length - 5} งาน`);
		return `${row.name}: ${tasks.length} งาน\n${lines.join('\n')}`;
	}
	function href(row: Row, time: string) {
		const q = new URLSearchParams({ time });
		if (row.id != null) q.set(by === 'person' ? 'assignee' : 'project', String(row.id));
		else q.set('assignee', 'all');
		return `/tasks?${q}`;
	}
</script>

{#if rows.length}
	<div class="grid grid-cols-[minmax(0,1fr)_repeat(4,minmax(3rem,3.5rem))] gap-0.5 text-xs">
		<div></div>
		{#each COLUMNS as c, i (i)}
			<div class="flex flex-col items-center justify-end gap-0.5 pb-1 text-center leading-tight text-muted-foreground">
				{#if i < 2}
					<AlertTriangle class="size-3 text-red-600" />
				{:else}
					<Clock class="size-3 text-amber-700" />
				{/if}
				{c.label}
			</div>
		{/each}

		{#each rows as row (row.id)}
			<div class="flex items-center truncate pr-2 text-sm">
				<span class="truncate">{row.name}</span>
			</div>
			{#each row.cells as tasks, i (i)}
				{#if tasks.length}
					{@const color = shade(COLUMNS[i].ramp, tasks.length)}
					<a
						href={href(row, COLUMNS[i].time)}
						class="flex h-9 items-center justify-center rounded text-sm font-semibold tabular-nums outline-offset-1 hover:outline-2 hover:outline-foreground/50"
						style="background:{color};color:{textOn(color)}"
						aria-label="{row.name} {COLUMNS[i].label} {tasks.length} งาน"
						use:tip={hint(row, tasks)}>{tasks.length}</a
					>
				{:else}
					<div class="flex h-9 items-center justify-center rounded bg-muted/50 text-muted-foreground/60">–</div>
				{/if}
			{/each}
		{/each}
	</div>

	<div class="mt-4 space-y-1 text-xs text-muted-foreground">
		<div class="flex items-center gap-2">
			<span class="w-20">เลยกำหนด</span>
			{#each RED as c, i (c)}<span class="flex h-4 w-8 items-center justify-center rounded text-[10px]" style="background:{c};color:{textOn(c)}">{i === 2 ? '3+' : i + 1}</span>{/each}
		</div>
		<div class="flex items-center gap-2">
			<span class="w-20">ใกล้ครบกำหนด</span>
			{#each AMBER as c, i (c)}<span class="flex h-4 w-8 items-center justify-center rounded text-[10px]" style="background:{c};color:{textOn(c)}">{i === 2 ? '3+' : i + 1}</span>{/each}
		</div>
		<p class="pt-1">ตัวเลขคือจำนวนงาน คลิกช่องเพื่อดูรายการงาน</p>
	</div>
{:else}
	<p class="text-sm text-muted-foreground">ไม่มีงานที่ต้องเฝ้าระวัง 🎉</p>
{/if}
