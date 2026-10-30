<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import Plus from '@lucide/svelte/icons/user-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { fmtDate } from '#lib/task-utils.js';
	import type { SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	type U = PageProps['data']['users'][number];
	let editing = $state<U | null>(null);
	let creating = $state(false);
	const me = $derived(page.data.user!);

	const submit =
		(ok: string): SubmitFunction =>
		({ cancel, action }) => {
			if (action.search.includes('delete') && !confirm('ลบพนักงานคนนี้? งานที่รับผิดชอบจะกลายเป็น "ไม่มีผู้รับผิดชอบ"\nแนะนำให้ "ปิดการใช้งาน" แทนเพื่อเก็บประวัติ')) {
				cancel();
				return;
			}
			return async ({ result, update }) => {
				if (result.type === 'success') {
					toast.success(ok);
					editing = null;
					creating = false;
				} else if (result.type === 'failure') toast.error(String(result.data?.message));
				await update();
			};
		};
	const selectClass = 'h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm';
</script>

{#snippet fields(u: Partial<U>, isNew: boolean)}
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="grid gap-2"><Label for="name">ชื่อ</Label><Input id="name" name="name" value={u.name ?? ''} required /></div>
		<div class="grid gap-2"><Label for="email">อีเมล (ใช้ Login)</Label><Input id="email" name="email" type="email" value={u.email ?? ''} required /></div>
		<div class="grid gap-2"><Label for="position">ตำแหน่ง</Label><Input id="position" name="position" value={u.position ?? ''} /></div>
		<div class="grid gap-2"><Label for="level">ระดับ</Label><Input id="level" name="level" value={u.level ?? ''} /></div>
		<div class="grid gap-2 sm:col-span-2"><Label for="duties">หน้าที่หลัก</Label><Input id="duties" name="duties" value={u.duties ?? ''} /></div>
		<div class="grid gap-2"><Label for="startDate">วันเริ่มงาน</Label><Input id="startDate" name="startDate" type="date" value={u.startDate ?? ''} /></div>
		<div class="grid gap-2">
			<Label for="role">สิทธิ์</Label>
			<select id="role" name="role" class={selectClass} value={u.role ?? 'employee'}>
				<option value="employee">พนักงาน</option>
				<option value="admin">Admin</option>
			</select>
		</div>
		<div class="grid gap-2">
			<Label for="password">{isNew ? 'รหัสผ่าน' : 'ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)'}</Label>
			<Input id="password" name="password" type="password" autocomplete="new-password" minlength={6} required={isNew} />
		</div>
		<label class="flex items-center gap-2 self-end pb-2 text-sm">
			<input type="checkbox" name="active" checked={u.active ?? true} /> เปิดใช้งานบัญชี
		</label>
	</div>
{/snippet}

<svelte:head><title>จัดการพนักงาน · PMO</title></svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">จัดการพนักงาน</h1>
		<p class="text-sm text-muted-foreground">เพิ่ม / แก้ไข / ปิดการใช้งาน / ลบ บัญชีผู้ใช้</p>
	</div>
	<Button onclick={() => (creating = true)}><Plus /> เพิ่มพนักงาน</Button>
</div>

<Card.Root class="py-0">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-6">ชื่อ</Table.Head>
				<Table.Head>อีเมล</Table.Head>
				<Table.Head>ระดับ</Table.Head>
				<Table.Head>เริ่มงาน</Table.Head>
				<Table.Head>สิทธิ์</Table.Head>
				<Table.Head class="text-right">งานค้าง</Table.Head>
				<Table.Head class="pr-6 text-right"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.users as u (u.id)}
				<Table.Row class={u.active ? '' : 'opacity-50'}>
					<Table.Cell class="pl-6">
						<div class="font-medium">{u.name} {#if !u.active}<span class="text-xs font-normal">(ปิดใช้งาน)</span>{/if}</div>
						<div class="text-xs text-muted-foreground">{u.position}</div>
					</Table.Cell>
					<Table.Cell class="text-sm">{u.email}</Table.Cell>
					<Table.Cell class="text-sm">{u.level ?? '-'}</Table.Cell>
					<Table.Cell class="text-sm">{fmtDate(u.startDate)}</Table.Cell>
					<Table.Cell>
						<span class="rounded-full px-2 py-0.5 text-xs {u.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}">{u.role === 'admin' ? 'Admin' : 'พนักงาน'}</span>
					</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{u.open}</Table.Cell>
					<Table.Cell class="pr-6 text-right">
						<Button variant="ghost" size="icon-sm" aria-label="แก้ไข {u.name}" onclick={() => (editing = u)}><Pencil /></Button>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</Card.Root>

<Dialog.Root bind:open={creating}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header><Dialog.Title>เพิ่มพนักงาน</Dialog.Title></Dialog.Header>
		<form method="POST" action="?/create" use:enhance={submit('เพิ่มพนักงานแล้ว')}>
			{@render fields({}, true)}
			<Dialog.Footer class="mt-6"><Button type="submit">บันทึก</Button></Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={!!editing} onOpenChange={(o) => !o && (editing = null)}>
	<Dialog.Content class="sm:max-w-2xl">
		{#if editing}
			<Dialog.Header><Dialog.Title>แก้ไข: {editing.name}</Dialog.Title></Dialog.Header>
			<form method="POST" action="?/update" use:enhance={submit('บันทึกแล้ว')}>
				<input type="hidden" name="id" value={editing.id} />
				{@render fields(editing, false)}
				<Dialog.Footer class="mt-6 sm:justify-between">
					{#if editing.id !== me.id}
						<Button type="submit" variant="destructive" formaction="?/delete">ลบพนักงาน</Button>
					{:else}<span></span>{/if}
					<Button type="submit">บันทึก</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
