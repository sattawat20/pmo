<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '#lib/task-utils.js';

	type Opt = { id: number; name: string };
	let {
		task = {},
		people,
		projects,
		isAdmin,
		readonly = false
	}: {
		task?: Partial<{
			title: string;
			projectId: number;
			assigneeId: number | null;
			priority: string;
			status: string;
			startDate: string | null;
			dueDate: string | null;
			estimatedHours: number;
			actualHours: number;
			progress: number;
			note: string | null;
		}>;
		people: Opt[];
		projects: Opt[];
		isAdmin: boolean;
		readonly?: boolean;
	} = $props();

	const selectClass =
		'h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60';
</script>

<fieldset class="grid gap-4 sm:grid-cols-2" disabled={readonly}>
	<div class="grid gap-2 sm:col-span-2">
		<Label for="title">ชื่องาน</Label>
		<Input id="title" name="title" value={task.title ?? ''} required />
	</div>
	<div class="grid gap-2">
		<Label for="projectId">โปรเจกต์</Label>
		<select id="projectId" name="projectId" class={selectClass} value={String(task.projectId ?? projects[0]?.id ?? '')} required>
			{#each projects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
		</select>
	</div>
	<div class="grid gap-2">
		<Label for="assigneeId">ผู้รับผิดชอบ</Label>
		<select id="assigneeId" name="assigneeId" class={selectClass} value={String(task.assigneeId ?? '')} disabled={!isAdmin || readonly}>
			<option value="">— ไม่ระบุ —</option>
			{#each people as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
		</select>
	</div>
	<div class="grid gap-2">
		<Label for="status">สถานะ</Label>
		<select id="status" name="status" class={selectClass} value={task.status ?? 'todo'}>
			{#each STATUSES as s (s)}<option value={s}>{STATUS_LABEL[s]}</option>{/each}
		</select>
	</div>
	<div class="grid gap-2">
		<Label for="priority">ความสำคัญ</Label>
		<select id="priority" name="priority" class={selectClass} value={task.priority ?? 'medium'}>
			{#each PRIORITIES as p (p)}<option value={p}>{PRIORITY_LABEL[p]}</option>{/each}
		</select>
	</div>
	<div class="grid gap-2">
		<Label for="startDate">วันเริ่ม</Label>
		<Input id="startDate" name="startDate" type="date" value={task.startDate ?? ''} />
	</div>
	<div class="grid gap-2">
		<Label for="dueDate">กำหนดส่ง</Label>
		<Input id="dueDate" name="dueDate" type="date" value={task.dueDate ?? ''} />
	</div>
	<div class="grid gap-2">
		<Label for="estimatedHours">ชั่วโมงประเมิน</Label>
		<Input id="estimatedHours" name="estimatedHours" type="number" min="0" step="0.5" value={task.estimatedHours ?? 0} />
	</div>
	<div class="grid gap-2">
		<Label for="actualHours">ชั่วโมงใช้จริง</Label>
		<Input id="actualHours" name="actualHours" type="number" min="0" step="0.5" value={task.actualHours ?? 0} />
	</div>
	<div class="grid gap-2 sm:col-span-2">
		<Label for="progress">% ความคืบหน้า</Label>
		<Input id="progress" name="progress" type="number" min="0" max="100" step="5" value={task.progress ?? 0} />
	</div>
	<div class="grid gap-2 sm:col-span-2">
		<Label for="note">หมายเหตุ</Label>
		<Textarea id="note" name="note" rows={3} value={task.note ?? ''} />
	</div>
</fieldset>
