import { render } from "./render";
import { createvnode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // vnode
      // component => vnode
      // 再对vnode进行处理
      const vnode = createvnode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}
