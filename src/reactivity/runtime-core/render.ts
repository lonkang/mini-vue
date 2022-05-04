import { createCompomentInstace, setupComponent } from "./compoment";

export function render(VNode, container) {
  patch(VNode, container);
}
function patch(VNode, container) {
  // 处理组件
  processComponent(VNode, container);
}
function processComponent(VNode, container) {
  mountCompoment(VNode, container);
}
function mountCompoment(VNode: any, container) {
  const instace = createCompomentInstace(VNode);
  setupComponent(instace);
  setupRenderEffect(instace, container);
}
function setupRenderEffect(instace, container) {
  const subTree = instace.render();

  // vnode => patch
  // vnode => element => mountCompoment
  patch(subTree, container);
}