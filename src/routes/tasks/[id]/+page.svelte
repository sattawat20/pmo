<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Undo from '@lucide/svelte/icons/undo-2';
	import Trash from '@lucide/svelte/icons/trash-2';
	import TaskForm from '#lib/components/TaskForm.svelte';
	import TimeBadge from '#lib/components/TimeBadge.svelte';
	import LogEntry from '#lib/components/LogEntry.svelte';
	import { STATUS_COLOR, STATUS_LABEL } from '#lib/task-utils.js';
	import type { SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(data.task);
	const isAdmin = $derived(page.data.user?.role === 'admin');

	const notify =
		(ok: string): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			if (result.type === 'success') toast.success(ok);
			else if (result.type === 'failure') toast.error(String(result.data?.message ?? 'ไม่สำเร็จ'));
			await update({ reset: false });
		};
</script>

<svelte:head><title>{t.code} · PMO</title></svelte:head>

<a href="/tasks" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
	<ArrowLeft class="size-4" /> กลับไปหน้างาน
</a>

<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
			<span class="font-mono">{t.code}</span>·
			<a href="/projects/{data.project.id}" class="hover:underline">{data.project.name}</a>
			<span class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs text-foreground">
				<span class="size-2 rounded-full" style="background:{STATUS_COLOR[t.status]}"></span>{STATUS_LABEL[t.status]}
			</span>
			<TimeBadge status={t.status} dueDate={t.dueDate} today={data.today} />
		</div>
		<h1 class="mt-1 text-2xl font-semibold">{t.title}</h1>
	</div>
	{#if isAdmin}
		<AlertDialog.Root>
			<AlertDialog.Trigger class={buttonVariants({ variant: 'destructive' })}><Trash /> ลบงาน</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>ลบงาน {t.code}?</AlertDialog.Title>
					<AlertDialog.Description>ข้อมูลจะถูกเก็บไว้ในประวัติ และ Admin สามารถกู้คืนได้จากหน้า "ประวัติ"</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>ยกเลิก</AlertDialog.Cancel>
					<form method="POST" action="?/delete" use:enhance={notify('ลบงานแล้ว')}>
						<Button type="submit" variant="destructive">ลบ</Button>
					</form>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	{/if}
</div>

<div class="grid gap-6 lg:grid-cols-5">
	<Card.Root class="lg:col-span-3">
		<Card.Header>
			<Card.Title>รายละเอียดงาน</Card.Title>
			{#if !data.canEdit}<Card.Description>คุณดูได้อย่างเดียว — แก้ไขได้เฉพาะผู้รับผิดชอบหรือ Admin</Card.Description>{/if}
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/update" use:enhance={notify('บันทึกแล้ว')}>
				{#key t.updatedAt}
					<TaskForm task={t} people={data.people} projects={data.projects} {isAdmin} readonly={!data.canEdit} />
				{/key}
				{#if data.canEdit}
					<div class="mt-6 flex justify-end"><Button type="submit">บันทึกการเปลี่ยนแปลง</Button></div>
				{/if}
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="lg:col-span-2">
		<Card.Header>
			<Card.Title>ประวัติการแก้ไข</Card.Title>
			<Card.Description>ใครแก้อะไรเมื่อไร — กด "ย้อนกลับ" เพื่อคืนค่าเดิม</Card.Description>
		</Card.Header>
		<Card.Content class="divide-y py-0">
			{#each data.history as h (h.log.id)}
				<LogEntry log={h.log} userName={h.userName} lookup={data.lookup}>
					{#snippet actions()}
						{#if data.canEdit && (h.log.action === 'update' || h.log.action === 'revert')}
							<form method="POST" action="?/revert" use:enhance={notify('ย้อนกลับแล้ว')}>
								<input type="hidden" name="logId" value={h.log.id} />
								<button type="submit" class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 hover:bg-muted">
									<Undo class="size-3" /> ย้อนกลับ
								</button>
							</form>
						{/if}
					{/snippet}
				</LogEntry>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
