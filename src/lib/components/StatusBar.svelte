<script lang="ts">
	import { STATUSES, STATUS_COLOR, STATUS_LABEL } from '#lib/task-utils.js';

	// แถบสะสม To do / Doing / Done — ช่องว่าง 2px คั่นแต่ละช่วง, tooltip ด้วย title
	let { todo, doing, done, max }: { todo: number; doing: number; done: number; max?: number } = $props();
	const counts = $derived({ todo, doing, done });
	const total = $derived(todo + doing + done);
	const width = $derived(max ? (total / max) * 100 : 100);
</script>

<div class="flex h-2.5 w-full" role="img" aria-label="To do {todo}, Doing {doing}, Done {done}">
	<div class="flex h-full gap-[2px]" style="width:{width}%">
		{#each STATUSES as s (s)}
			{#if counts[s] > 0}
				<div
					class="h-full first:rounded-l last:rounded-r"
					style="flex:{counts[s]};background:{STATUS_COLOR[s]}"
					title="{STATUS_LABEL[s]}: {counts[s]} งาน"
				></div>
			{/if}
		{/each}
	</div>
</div>
