import { ShapeFlags } from "../shared/ShapeFlags";

export function initSlots(instance, children) {
  // 只有是slot 才添加
  const { vnode } = instance;
  if (vnode.ShapeFlag & ShapeFlags.SLOT_CHILDREN) {
    noramilzeObjectSlots(instance.slots, children);
  }
}

function noramilzeObjectSlots(slots, children) {
  for (const key in children) {
    const val = children[key];
    slots[key] = (props) => normailzeSlotValue(val(props));
  }
}

function normailzeSlotValue(val) {
  return Array.isArray(val) ? val : [val];
}
