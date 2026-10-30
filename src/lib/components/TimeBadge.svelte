<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { daysLeft, timeStatus, type Status } from '#lib/task-utils.js';

	let { status, dueDate, today }: { status: Status; dueDate: string | null; today?: string } = $props();
	const ts = $derived(timeStatus({ status, dueDate }, today));
	const d = $derived(daysLeft(dueDate, today));
</script>

{#if ts === 'overdue'}
	<span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
		<AlertTriangle class="size-3" /> เกินกำหนด {Math.abs(d!)} วัน
	</span>
{:else if ts === 'due-soon'}
	<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
		<Clock class="size-3" /> {d === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${d} วัน`}
	</span>
{/if}
