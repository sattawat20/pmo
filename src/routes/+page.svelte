<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import StatusBar from '#lib/components/StatusBar.svelte';
	import TimeBadge from '#lib/components/TimeBadge.svelte';
	import LogEntry from '#lib/components/LogEntry.svelte';
	import StatusDonut from '#lib/components/charts/StatusDonut.svelte';
	import WeeklyDueChart from '#lib/components/charts/WeeklyDueChart.svelte';
	import HoursChart from '#lib/components/charts/HoursChart.svelte';
	import { STATUSES, STATUS_COLOR, STATUS_LABEL, fmtDate } from '#lib/task-utils.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const s = $derived(data.summary);
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const maxPerson = $derived(Math.max(1, ...data.people.map((p) => p.total)));

	const kpis = $derived([
		{ label: 'งานทั้งหมด', value: s.total },
		{ label: 'เสร็จแล้ว', value: s.done, sub: pct(s.rate) },
		{ label: 'กำลังทำ', value: s.doing },
		{ label: 'เกินกำหนด', value: s.overdue, alert: s.overdue > 0 },
		{ label: 'ใกล้ครบกำหนด', value: s.dueSoon },
		{ label: 'ชั่วโมง จริง / ประเมิน', value: `${s.actual} / ${s.est}` }
	]);
</script>

<svelte:head><title>Dashboard · PMO</title></svelte:head>

<div class="mb-6 flex flex-wrap items-end justify-between gap-2">
	<div>
		<h1 class="text-2xl font-semibold">{data.isAdmin ? 'Dashboard ภาพรวมทีม' : 'งานของฉัน'}</h1>
		<p class="text-sm text-muted-foreground">ข้อมูล ณ วันที่ {fmtDate(data.today)} · อัปเดตแบบ real-time จากฐานข้อมูล</p>
	</div>
	<div class="flex items-center gap-3 text-xs text-muted-foreground">
		{#each STATUSES as st (st)}
			<span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm" style="background:{STATUS_COLOR[st]}"></span>{STATUS_LABEL[st]}</span>
		{/each}
	</div>
</div>

<div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
	{#each kpis as k (k.label)}
		<Card.Root class="gap-1 py-4">
			<Card.Content class="px-4">
				<div class="text-xs text-muted-foreground">{k.label}</div>
				<div class="mt-1 text-2xl font-semibold tabular-nums {k.alert ? 'text-red-600' : ''}">{k.value}</div>
				{#if k.sub}<div class="text-xs text-muted-foreground">อัตราสำเร็จ {k.sub}</div>{/if}
			</Card.Content>
		</Card.Root>
	{/each}
</div>

<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
	<Card.Root>
		<Card.Header>
			<Card.Title>สถานะงาน{data.isAdmin ? 'ทั้งทีม' : 'ของฉัน'}</Card.Title>
			<Card.Description>สัดส่วนงานแต่ละสถานะ</Card.Description>
		</Card.Header>
		<Card.Content><StatusDonut counts={s} /></Card.Content>
	</Card.Root>
	<Card.Root class="lg:col-span-2">
		<Card.Header>
			<Card.Title>กำหนดส่งรายสัปดาห์</Card.Title>
			<Card.Description>งานที่ยังไม่เสร็จ แยกตามสัปดาห์ที่ครบกำหนด</Card.Description>
		</Card.Header>
		<Card.Content><WeeklyDueChart {...data.weekly} /></Card.Content>
	</Card.Root>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		{#if data.isAdmin}
			<Card.Root>
				<Card.Header>
					<Card.Title>สรุปรายคน</Card.Title>
					<Card.Description>จำนวนงานแยกตามสถานะ งานที่เกินกำหนด และชั่วโมงทำงาน</Card.Description>
				</Card.Header>
				<Card.Content class="px-0">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-6">ผู้รับผิดชอบ</Table.Head>
								<Table.Head class="w-[30%]">สถานะงาน</Table.Head>
								<Table.Head class="text-right">To do</Table.Head>
								<Table.Head class="text-right">Doing</Table.Head>
								<Table.Head class="text-right">Done</Table.Head>
								<Table.Head class="text-right">เกินกำหนด</Table.Head>
								<Table.Head class="pr-6 text-right">ชม. จริง/ประเมิน</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.people as p (p.id)}
								<Table.Row>
									<Table.Cell class="pl-6">
										<a href="/tasks?assignee={p.id}" class="font-medium hover:underline">{p.name}</a>
										<div class="text-xs text-muted-foreground">{p.position}</div>
									</Table.Cell>
									<Table.Cell><StatusBar todo={p.todo} doing={p.doing} done={p.done} max={maxPerson} /></Table.Cell>
									<Table.Cell class="text-right tabular-nums">{p.todo}</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{p.doing}</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{p.done}</Table.Cell>
									<Table.Cell class="text-right tabular-nums {p.overdue ? 'font-semibold text-red-600' : 'text-muted-foreground'}">{p.overdue}</Table.Cell>
									<Table.Cell class="pr-6 text-right tabular-nums text-muted-foreground">{p.actual}/{p.est}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>ชั่วโมงทำงานรายคน</Card.Title>
					<Card.Description>เทียบชั่วโมงประเมินกับชั่วโมงที่ใช้จริง</Card.Description>
				</Card.Header>
				<Card.Content><HoursChart people={data.people} /></Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>สรุปรายโปรเจกต์</Card.Title>
				<Card.Description>สัดส่วนงานแต่ละสถานะ และความคืบหน้าเฉลี่ย</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#each data.byProject as p (p.id)}
					<div>
						<div class="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
							<a href="/projects/{p.id}" class="font-medium hover:underline">{p.name}</a>
							<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
								เสร็จ {p.done}/{p.total} · คืบหน้าเฉลี่ย {Math.round(p.avgProgress)}%
								{#if p.overdue}<span class="ml-1 font-medium text-red-600">· เกินกำหนด {p.overdue}</span>{/if}
							</span>
						</div>
						<StatusBar todo={p.todo} doing={p.doing} done={p.done} />
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">ยังไม่มีงาน</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>งานที่ช้า / ใกล้ครบกำหนด</Card.Title>
				<Card.Description>ยังไม่เสร็จ และเลยหรือเหลือไม่เกิน 3 วัน</Card.Description>
			</Card.Header>
			<Card.Content class="divide-y">
				{#each data.late as t (t.id)}
					<a href="/tasks/{t.id}" class="block py-2.5 first:pt-0 hover:opacity-80">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 text-sm font-medium">{t.code} {t.title}</div>
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<TimeBadge status={t.status} dueDate={t.dueDate} today={data.today} />
							<span>{t.assigneeName ?? 'ไม่มีผู้รับผิดชอบ'}</span>
							<span>· กำหนด {fmtDate(t.dueDate)}</span>
						</div>
					</a>
				{:else}
					<p class="text-sm text-muted-foreground">ไม่มีงานที่ช้า 🎉</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>ความเคลื่อนไหวล่าสุด</Card.Title>
			</Card.Header>
			<Card.Content class="divide-y py-0">
				{#each data.recent as r (r.log.id)}
					<LogEntry log={r.log} userName={r.userName} />
				{/each}
				<a href="/activity" class="block py-3 text-sm text-muted-foreground hover:text-foreground">ดูประวัติทั้งหมด →</a>
			</Card.Content>
		</Card.Root>
	</div>
</div>
