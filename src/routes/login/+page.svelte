<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let loading = $state(false);
</script>

<svelte:head><title>เข้าสู่ระบบ · PMO</title></svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-msu-green p-4">
	<div class="mb-6 text-center text-white">
		<div class="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-msu-yellow font-display text-2xl font-bold text-[#333]">P</div>
		<h1 class="text-2xl">ระบบติดตามงาน PMO</h1>
		<p class="font-display text-sm font-light text-white/80">มหาวิทยาลัยมหาสารคาม · MAHASARAKHAM UNIVERSITY</p>
	</div>
	<Card.Root class="w-full max-w-sm border-t-4 border-t-msu-yellow">
		<Card.Header>
			<Card.Title class="text-xl">เข้าสู่ระบบ</Card.Title>
			<Card.Description>ใช้อีเมลและรหัสผ่านของคุณ</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				class="grid gap-4"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				<div class="grid gap-2">
					<Label for="email">อีเมล</Label>
					<Input id="email" name="email" type="email" autocomplete="username" value={form?.email ?? ''} required />
				</div>
				<div class="grid gap-2">
					<Label for="password">รหัสผ่าน</Label>
					<Input id="password" name="password" type="password" autocomplete="current-password" required />
				</div>
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<Button type="submit" disabled={loading}>{loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
