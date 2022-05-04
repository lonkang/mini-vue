import { render } from "./render";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mouted(rootContainer) {
      // VNode
      // component => VNode
      // 再对VNode进行处理
      const VNode = createVNode(rootComponent);
      render(VNode, rootContainer);
    },
  };
}
