<script lang="ts">
	// ตัวกรองแบบ native select ที่เปลี่ยน query string ของหน้า
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let {
		name,
		value,
		options,
		label
	}: { name: string; value: string; options: { value: string; label: string }[]; label: string } = $props();

	function onchange(e: Event) {
		const url = new URL(page.url.href);
		url.searchParams.set(name, (e.currentTarget as HTMLSelectElement).value);
		url.searchParams.delete('page');
		goto(url, { replace: true, reset: false });
	}
</script>

<label class="flex items-center gap-2 text-sm">
	<span class="text-muted-foreground">{label}</span>
	<select
		{value}
		{onchange}
		class="h-9 rounded-full border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
	>
		{#each options as o (o.value)}
			<option value={o.value}>{o.label}</option>
		{/each}
	</select>
</label>
