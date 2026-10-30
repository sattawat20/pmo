<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import StatusBar from '#lib/components/StatusBar.svelte';
	import { fmtDate } from '#lib/task-utils.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const isAdmin = $derived(page.data.user?.role === 'admin');
</script>

<svelte:head><title>โปรเจกต์ · PMO</title></svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">โปรเจกต์</h1>
		<p class="text-sm text-muted-foreground">{data.projects.length} โปรเจกต์ (ลูกค้า / โครงการ)</p>
	</div>
	{#if isAdmin}
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet child({ props })}<Button {...props}><Plus /> เพิ่มโปรเจกต์</Button>{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header><Dialog.Title>เพิ่มโปรเจกต์</Dialog.Title></Dialog.Header>
				<form method="POST" action="?/create" use:enhance class="grid gap-4">
					<div class="grid gap-2"><Label for="name">ชื่อโปรเจกต์ / ลูกค้า</Label><Input id="name" name="name" required /></div>
					<div class="grid gap-2"><Label for="description">รายละเอียด</Label><Textarea id="description" name="description" rows={3} /></div>
					{#if form?.message}<p class="text-sm text-destructive">{form.message}</p>{/if}
					<Dialog.Footer><Button type="submit">บันทึก</Button></Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.projects as p (p.id)}
		<a href="/projects/{p.id}" class="block transition hover:-translate-y-0.5">
			<Card.Root class="h-full {p.archived ? 'opacity-60' : ''}">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						{p.name}
						{#if p.archived}<span class="rounded-full bg-muted px-2 text-xs font-normal">เก็บถาวร</span>{/if}
					</Card.Title>
					<Card.Description>{p.members.join(', ') || 'ยังไม่มีสมาชิก'}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<StatusBar todo={p.todo} doing={p.doing} done={p.done} />
					<div class="flex justify-between text-xs text-muted-foreground tabular-nums">
						<span>เสร็จ {p.done}/{p.total} งาน</span>
						{#if p.overdue}<span class="font-medium text-red-600">เกินกำหนด {p.overdue}</span>{/if}
						<span>ถึง {fmtDate(p.lastDue)}</span>
					</div>
				</Card.Content>
			</Card.Root>
		</a>
	{/each}
</div>
