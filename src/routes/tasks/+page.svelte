<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import FilterSelect from '#lib/components/FilterSelect.svelte';
	import TaskForm from '#lib/components/TaskForm.svelte';
	import TimeBadge from '#lib/components/TimeBadge.svelte';
	import { PRIORITY_LABEL, STATUSES, STATUS_COLOR, STATUS_LABEL, TIME_STATUS_LABEL, fmtDate } from '#lib/task-utils.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let open = $state(false);
	const isAdmin = $derived(page.data.user?.role === 'admin');

	function search(e: SubmitEvent) {
		e.preventDefault();
		const url = new URL(page.url.href);
		url.searchParams.set('q', new FormData(e.currentTarget as HTMLFormElement).get('q') as string);
		goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head><title>งาน · PMO</title></svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">งานทั้งหมด</h1>
		<p class="text-sm text-muted-foreground">พบ {data.tasks.length} งาน</p>
	</div>
	<Dialog.Root bind:open>
		<Dialog.Trigger>
			{#snippet child({ props })}
				<Button {...props}><Plus /> เพิ่มงาน</Button>
			{/snippet}
		</Dialog.Trigger>
		<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>เพิ่มงานใหม่</Dialog.Title>
				<Dialog.Description>{isAdmin ? 'มอบหมายงานให้สมาชิกในทีม' : 'งานที่สร้างจะถูกมอบหมายให้คุณ'}</Dialog.Description>
			</Dialog.Header>
			<form method="POST" action="?/create" use:enhance>
				<TaskForm people={data.people} projects={data.projects} {isAdmin} task={{ assigneeId: page.data.user?.id }} />
				{#if form?.message}<p class="mt-3 text-sm text-destructive">{form.message}</p>{/if}
				<Dialog.Footer class="mt-6">
					<Button type="submit">บันทึก</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<form onsubmit={search} class="w-full sm:w-64">
		<Input name="q" placeholder="ค้นหารหัส / ชื่องาน…" value={data.filter.q} />
	</form>
	<FilterSelect name="assignee" label="คน" value={data.filter.assignee}
		options={[{ value: 'all', label: 'ทุกคน' }, ...data.people.map((p) => ({ value: String(p.id), label: p.name }))]} />
	<FilterSelect name="project" label="โปรเจกต์" value={data.filter.project}
		options={[{ value: 'all', label: 'ทั้งหมด' }, ...data.projects.map((p) => ({ value: String(p.id), label: p.name }))]} />
	<FilterSelect name="status" label="สถานะ" value={data.filter.status}
		options={[{ value: 'all', label: 'ทั้งหมด' }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
	<FilterSelect name="time" label="เวลา" value={data.filter.time}
		options={[{ value: 'all', label: 'ทั้งหมด' }, ...(['overdue', 'due-soon', 'normal', 'done'] as const).map((s) => ({ value: s, label: TIME_STATUS_LABEL[s] }))]} />
</div>

<Card.Root class="py-0">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-6">รหัส</Table.Head>
				<Table.Head>งาน</Table.Head>
				<Table.Head>ผู้รับผิดชอบ</Table.Head>
				<Table.Head>สถานะ</Table.Head>
				<Table.Head>ความสำคัญ</Table.Head>
				<Table.Head>กำหนดส่ง</Table.Head>
				<Table.Head class="pr-6 text-right">คืบหน้า</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.tasks as t (t.id)}
				<Table.Row class="cursor-pointer" onclick={() => goto(`/tasks/${t.id}`)}>
					<Table.Cell class="pl-6 font-mono text-xs text-muted-foreground">{t.code}</Table.Cell>
					<Table.Cell class="max-w-sm whitespace-normal">
						<a href="/tasks/{t.id}" class="font-medium hover:underline">{t.title}</a>
						<div class="text-xs text-muted-foreground">{t.projectName}</div>
					</Table.Cell>
					<Table.Cell>{t.assigneeName ?? '—'}</Table.Cell>
					<Table.Cell>
						<span class="inline-flex items-center gap-1.5 text-sm">
							<span class="size-2 rounded-full" style="background:{STATUS_COLOR[t.status]}"></span>{STATUS_LABEL[t.status]}
						</span>
					</Table.Cell>
					<Table.Cell class="text-sm">{PRIORITY_LABEL[t.priority]}</Table.Cell>
					<Table.Cell>
						<div class="text-sm">{fmtDate(t.dueDate)}</div>
						<TimeBadge status={t.status} dueDate={t.dueDate} today={data.today} />
					</Table.Cell>
					<Table.Cell class="pr-6 text-right tabular-nums">{t.progress}%</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row><Table.Cell colspan={7} class="py-10 text-center text-muted-foreground">ไม่พบงาน</Table.Cell></Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</Card.Root>
