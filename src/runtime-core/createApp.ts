import { createvnode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // vnode
        // component => vnode
        // 再对vnode进行处理
        const vnode = createvnode(rootComponent);
        render(vnode, rootContainer);
      },
    };
  };
}
