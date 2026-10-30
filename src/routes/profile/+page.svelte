<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const u = $derived(data.user!);
</script>

<svelte:head><title>โปรไฟล์ · PMO</title></svelte:head>

<div class="mx-auto grid max-w-xl gap-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>{u.name}</Card.Title>
			<Card.Description>{u.position} · {u.email} · {u.role === 'admin' ? 'Admin' : 'พนักงาน'}</Card.Description>
		</Card.Header>
		<Card.Content class="text-sm text-muted-foreground">{u.duties}</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header><Card.Title>เปลี่ยนรหัสผ่าน</Card.Title></Card.Header>
		<Card.Content>
			<form method="POST" action="?/password" use:enhance class="grid gap-4">
				<div class="grid gap-2"><Label for="current">รหัสผ่านปัจจุบัน</Label><Input id="current" name="current" type="password" autocomplete="current-password" required /></div>
				<div class="grid gap-2"><Label for="next">รหัสผ่านใหม่</Label><Input id="next" name="next" type="password" autocomplete="new-password" minlength={6} required /></div>
				{#if form?.message}<p class="text-sm text-destructive">{form.message}</p>{/if}
				{#if form?.ok}<p class="text-sm text-green-700">เปลี่ยนรหัสผ่านแล้ว</p>{/if}
				<Button type="submit">บันทึก</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
