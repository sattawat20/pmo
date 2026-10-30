<script lang="ts">
	import { tip } from '#lib/chart-tip.js';

	type Row = { id: number; name: string; est: number; actual: number };
	let { people }: { people: Row[] } = $props();

	// ชุดสีผ่าน validate_palette: เหลืองคอนทราสต์ต่ำกว่า 3:1 จึงต้องมีตัวเลขกำกับทุกแถว
	const EST = '#d9a400';
	const ACTUAL = '#00824c';
	const max = $derived(Math.max(1, ...people.flatMap((p) => [p.est, p.actual])));
	const width = (n: number) => `${(n / max) * 100}%`;
</script>

<div class="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm" style="background:{EST}"></span>ชั่วโมงประเมิน</span>
	<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm" style="background:{ACTUAL}"></span>ชั่วโมงใช้จริง</span>
</div>

<ul class="grid gap-x-8 gap-y-3 sm:grid-cols-2">
	{#each people as p (p.id)}
		<li use:tip={`${p.name}\nประเมิน ${p.est} ชม. · ใช้จริง ${p.actual} ชม.`}>
			<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
				<span class="truncate">{p.name}</span>
				<span class="shrink-0 text-xs text-muted-foreground tabular-nums">{p.actual} / {p.est} ชม.</span>
			</div>
			<div class="space-y-0.5">
				<div class="h-1.5 rounded-r" style="width:{width(p.est)};background:{EST}"></div>
				<div class="h-1.5 rounded-r" style="width:{width(p.actual)};background:{ACTUAL}"></div>
			</div>
		</li>
	{/each}
</ul>
