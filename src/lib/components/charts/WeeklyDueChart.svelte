<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import { tip } from '#lib/chart-tip.js';
	import { OVERDUE_COLOR, STATUS_COLOR } from '#lib/task-utils.js';

	let { overdue, weeks, later }: { overdue: number; weeks: { start: string; count: number }[]; later: number } = $props();

	const short = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
	const columns = $derived([
		{ key: 'overdue', label: 'เลยกำหนด', count: overdue, color: OVERDUE_COLOR, hint: `เลยกำหนดแล้ว: ${overdue} งาน` },
		...weeks.map((w, i) => {
			const label = i === 0 ? 'สัปดาห์นี้' : short.format(new Date(w.start));
			return { key: w.start, label, count: w.count, color: STATUS_COLOR.doing, hint: `${i === 0 ? 'สัปดาห์นี้' : `สัปดาห์เริ่ม ${label}`}: ${w.count} งาน` };
		}),
		{ key: 'later', label: 'หลังจากนั้น', count: later, color: STATUS_COLOR.doing, hint: `หลังจากนั้น: ${later} งาน` }
	]);
	const max = $derived(Math.max(1, ...columns.map((c) => c.count)));
</script>

<div class="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm" style="background:{STATUS_COLOR.doing}"></span>งานที่ครบกำหนด</span>
	<span class="flex items-center gap-1.5"><AlertTriangle class="size-3" style="color:{OVERDUE_COLOR}" />เลยกำหนดแล้ว</span>
</div>

<!-- จอแคบเลื่อนในกรอบได้ เพื่อไม่ให้ป้ายแกนเบียดกัน -->
<div class="overflow-x-auto overflow-y-hidden pb-2">
	<div class="flex min-w-[30rem] items-stretch gap-1" role="img" aria-label="จำนวนงานที่ยังไม่เสร็จตามสัปดาห์ของกำหนดส่ง">
		{#each columns as c (c.key)}
			<div class="flex min-w-0 flex-1 flex-col" use:tip={c.hint}>
				<div class="flex h-36 flex-col justify-end">
					<div class="mb-1 text-center text-xs tabular-nums {c.count ? 'font-medium' : 'text-muted-foreground'}">{c.count}</div>
					{#if c.count}
						<div class="mx-auto w-full max-w-9 rounded-t" style="height:calc((100% - 1.25rem) * {c.count / max});background:{c.color}"></div>
					{/if}
				</div>
				<div class="border-t pt-1 text-center text-xs leading-tight text-muted-foreground">{c.label}</div>
			</div>
		{/each}
	</div>
</div>
