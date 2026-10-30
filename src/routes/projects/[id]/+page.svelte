<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import StatusBar from '#lib/components/StatusBar.svelte';
	import TimeBadge from '#lib/components/TimeBadge.svelte';
	import { STATUS_COLOR, STATUS_LABEL, fmtDate } from '#lib/task-utils.js';
	import type { SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isAdmin = $derived(page.data.user?.role === 'admin');
	const count = (s: 'todo' | 'doing' | 'done') => data.tasks.filter((t) => t.status === s).length;

	const notify =
		(ok: string): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			if (result.type === 'success') toast.success(ok);
			else if (result.type === 'failure') toast.error(String(result.data?.message));
			await update({ reset: false });
		};
</script>

<svelte:head><title>{data.project.name} · PMO</title></svelte:head>

<a href="/projects" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
	<ArrowLeft class="size-4" /> โปรเจกต์ทั้งหมด
</a>
<h1 class="text-2xl font-semibold">{data.project.name}</h1>
{#if data.project.description}<p class="mt-1 text-muted-foreground">{data.project.description}</p>{/if}

<div class="mt-4 mb-6 max-w-xl">
	<StatusBar todo={count('todo')} doing={count('doing')} done={count('done')} />
	<p class="mt-1.5 text-xs text-muted-foreground">To do {count('todo')} · Doing {count('doing')} · Done {count('done')}</p>
</div>

<div class="grid gap-6 lg:grid-cols-3">
	<Card.Root class="py-0 lg:col-span-2">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="pl-6">งาน</Table.Head>
					<Table.Head>ผู้รับผิดชอบ</Table.Head>
					<Table.Head>สถานะ</Table.Head>
					<Table.Head class="pr-6">กำหนดส่ง</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.tasks as t (t.id)}
					<Table.Row>
						<Table.Cell class="max-w-xs whitespace-normal pl-6">
							<a href="/tasks/{t.id}" class="font-medium hover:underline"><span class="font-mono text-xs text-muted-foreground">{t.code}</span> {t.title}</a>
						</Table.Cell>
						<Table.Cell>{t.assigneeName ?? '—'}</Table.Cell>
						<Table.Cell>
							<span class="inline-flex items-center gap-1.5 text-sm"><span class="size-2 rounded-full" style="background:{STATUS_COLOR[t.status]}"></span>{STATUS_LABEL[t.status]}</span>
						</Table.Cell>
						<Table.Cell class="pr-6">
							<div class="text-sm">{fmtDate(t.dueDate)}</div>
							<TimeBadge status={t.status} dueDate={t.dueDate} today={data.today} />
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row><Table.Cell colspan={4} class="py-8 text-center text-muted-foreground">ยังไม่มีงาน</Table.Cell></Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Root>

	{#if isAdmin}
		<Card.Root>
			<Card.Header><Card.Title>แก้ไขโปรเจกต์</Card.Title></Card.Header>
			<Card.Content>
				<form method="POST" action="?/update" use:enhance={notify('บันทึกแล้ว')} class="grid gap-4">
					<div class="grid gap-2"><Label for="name">ชื่อ</Label><Input id="name" name="name" value={data.project.name} required /></div>
					<div class="grid gap-2"><Label for="description">รายละเอียด</Label><Textarea id="description" name="description" rows={3} value={data.project.description ?? ''} /></div>
					<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" checked={data.project.archived} /> เก็บถาวร (ซ่อนจากตัวเลือก)</label>
					<Button type="submit">บันทึก</Button>
				</form>
				<form method="POST" action="?/delete" use:enhance={notify('ลบแล้ว')} class="mt-3"
					onsubmit={(e) => { if (!confirm('ลบโปรเจกต์นี้?')) e.preventDefault(); }}>
					<Button type="submit" variant="destructive" class="w-full">ลบโปรเจกต์</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
