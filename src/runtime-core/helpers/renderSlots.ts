import { Fragment } from "../vnode";
import { createvnode } from "../vnode";

export function renderSlots(slots, name, props) {
  const slot = slots[name];
  if (typeof slot === "function") {
    return createvnode(Fragment, {}, slot(props));
  }
}
