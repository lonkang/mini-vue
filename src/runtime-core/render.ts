import { isObject } from "../shared/index";
import { createCompomentInstace, setupComponent } from "./compoment";

export function render(vnode, container) {
  patch(vnode, container);
}
function patch(vnode, container) {
  // todo 判断vnode是不是一个element
  // 是element就处理element
  // 处理组件
  console.log(vnode.type);
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    processComponent(vnode, container);
  }
}

function processElement(vnode, container) {
  mountElement(vnode, container);
}
function mountElement(vnode, container) {
  const { type, children, props } = vnode;

  const el = document.createElement(type);

  if (typeof children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(children, el);
  }

  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val);
  }
  container.append(el);
}
function mountChildren(children, container) {
  children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode, container) {
  mountCompoment(vnode, container);
}
function mountCompoment(vnode: any, container) {
  const instace = createCompomentInstace(vnode);
  setupComponent(instace);
  setupRenderEffect(instace, container);
}
function setupRenderEffect(instace, container) {
  // 绑定proxy
  const { proxy } = instace;
  const subTree = instace.render.call(proxy);

  // vnode => patch
  // vnode => element => mountCompoment
  patch(subTree, container);
}
