<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { Button } from '#lib/components/ui/button/index.js';	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/square-kanban';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import Folder from '@lucide/svelte/icons/folder-kanban';
	import History from '@lucide/svelte/icons/history';
	import Users from '@lucide/svelte/icons/users';
	import LogOut from '@lucide/svelte/icons/log-out';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const nav = $derived([
		{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/board', label: 'Kanban', icon: Kanban },
		{ href: '/tasks', label: 'งาน', icon: ListTodo },
		{ href: '/projects', label: 'โปรเจกต์', icon: Folder },
		{ href: '/activity', label: 'ประวัติ', icon: History },
		...(data.user?.role === 'admin' ? [{ href: '/admin/users', label: 'พนักงาน', icon: Users }] : [])
	]);
	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster richColors position="top-right" />

{#if data.user}
	<header class="sticky top-0 z-40 border-b-4 border-msu-yellow bg-msu-green text-white shadow-sm">
		<div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
			<a href="/" class="mr-2 flex shrink-0 items-center gap-2.5">
				<span class="flex size-9 items-center justify-center rounded-xl bg-msu-yellow font-display text-lg font-bold text-[#333]">P</span>
				<span class="hidden leading-tight lg:block">
					<span class="block font-display text-base">ระบบติดตามงาน PMO</span>
					<span class="block font-display text-xs font-light text-white/80">มหาวิทยาลัยมหาสารคาม</span>
				</span>
			</a>
			<nav class="flex flex-1 items-center gap-1 overflow-x-auto">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors {active(item.href)
							? 'bg-msu-yellow font-medium text-[#333]'
							: 'text-white/85 hover:bg-white/10 hover:text-white'}"
					>
						<item.icon class="size-4" />
						<span class="hidden md:inline">{item.label}</span>
					</a>
				{/each}
			</nav>
			<div class="flex items-center gap-2">
				<a href="/profile" class="hidden text-right text-sm leading-tight sm:block">
					<div class="font-medium">{data.user.name}</div>
					<div class="text-xs text-white/75">{data.user.role === 'admin' ? 'Admin' : 'พนักงาน'}</div>
				</a>
				<form method="POST" action="/logout">
					<Button type="submit" variant="ghost" size="icon" title="ออกจากระบบ" aria-label="ออกจากระบบ" class="text-white hover:bg-white/15 hover:text-white">
						<LogOut />
					</Button>
				</form>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-7xl px-4 py-6">
		{@render children()}
	</main>
{:else}
	{@render children()}
{/if}
