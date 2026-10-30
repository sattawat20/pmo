import type { Action } from 'svelte/action';

// tooltip ของกราฟ: ใช้ element เดียวร่วมกันทั้งหน้า ตามเมาส์/นิ้ว
let box: HTMLDivElement | null = null;

function getBox() {
	if (!box) {
		box = document.createElement('div');
		box.setAttribute('role', 'tooltip');
		box.className =
			'pointer-events-none fixed z-50 hidden max-w-56 rounded-lg bg-[#333] px-2.5 py-1.5 text-xs whitespace-pre-line text-white shadow-md';
		document.body.appendChild(box);
	}
	return box;
}

export const tip: Action<Element, string> = (node, text) => {
	let current = text;
	const move = (e: Event) => {
		const { clientX, clientY } = e as PointerEvent;
		const el = getBox();
		el.textContent = current;
		el.classList.remove('hidden');
		const x = Math.min(clientX + 12, window.innerWidth - el.offsetWidth - 8);
		el.style.left = `${x}px`;
		el.style.top = `${Math.max(clientY - el.offsetHeight - 10, 8)}px`;
	};
	const hide = () => getBox().classList.add('hidden');

	node.addEventListener('pointerenter', move);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', hide);
	return {
		update(next) {
			current = next;
		},
		destroy() {
			node.removeEventListener('pointerenter', move);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', hide);
			hide();
		}
	};
};
