<script lang="ts">
	import { tip } from '#lib/chart-tip.js';
	import { STATUSES, STATUS_COLOR, STATUS_LABEL, STATUS_TH, type Status } from '#lib/task-utils.js';

	let { counts }: { counts: Record<Status, number> } = $props();

	const R = 46;
	const C = 2 * Math.PI * R;
	const GAP = 2; // ช่องว่างระหว่างช่วง

	const total = $derived(STATUSES.reduce((a, s) => a + counts[s], 0));
	const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
	const segments = $derived.by(() => {
		let offset = 0;
		return STATUSES.filter((s) => counts[s] > 0).map((s) => {
			const len = (counts[s] / total) * C;
			const seg = { status: s, dash: Math.max(len - GAP, 0.5), offset };
			offset += len;
			return seg;
		});
	});
</script>

<div class="flex flex-wrap items-center justify-center gap-6">
	<svg
		viewBox="0 0 120 120"
		class="size-40 shrink-0"
		role="img"
		aria-label="สัดส่วนสถานะงาน To do {counts.todo} Doing {counts.doing} Done {counts.done}"
	>
		<g transform="rotate(-90 60 60)" fill="none" stroke-width="14">
			{#each segments as s (s.status)}
				<circle
					cx="60"
					cy="60"
					r={R}
					stroke={STATUS_COLOR[s.status]}
					stroke-dasharray="{s.dash} {C - s.dash}"
					stroke-dashoffset={-s.offset}
					use:tip={`${STATUS_LABEL[s.status]}: ${counts[s.status]} งาน (${pct(counts[s.status])}%)`}
				/>
			{/each}
		</g>
		<text x="60" y="58" text-anchor="middle" class="fill-foreground text-[20px] font-semibold">{pct(counts.done)}%</text>
		<text x="60" y="73" text-anchor="middle" class="fill-muted-foreground text-[8px]">เสร็จแล้ว</text>
	</svg>
	<ul class="space-y-2 text-sm">
		{#each STATUSES as s (s)}
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-sm" style="background:{STATUS_COLOR[s]}"></span>
				<span>{STATUS_LABEL[s]}</span>
				<span class="text-xs text-muted-foreground">{STATUS_TH[s]}</span>
				<span class="ml-auto pl-3 font-medium tabular-nums">{counts[s]}</span>
			</li>
		{/each}
	</ul>
</div>
