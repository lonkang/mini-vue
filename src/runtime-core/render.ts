import { isObject } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createCompomentInstace, setupComponent } from "./compoment";

export function render(vnode, container) {
  patch(vnode, container);
}
function patch(vnode, container) {
  // todo 判断vnode是不是一个element
  // 是element就处理element
  // 处理组件
  const { ShapeFlag } = vnode;
  console.log(vnode.type);
  if (ShapeFlag & ShapeFlags.ELEMENT) {
    // 元素类型
    processElement(vnode, container);
  } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 组件类型
    processComponent(vnode, container);
  }
}

function processElement(vnode, container) {
  mountElement(vnode, container);
}
function mountElement(vnode, container) {
  const { type, children, props, ShapeFlag } = vnode;

  const el = (vnode.el = document.createElement(type));

  if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el);
  }
  // 处理props
  for (const key in props) {
    const val = props[key];
    const isOn = (value) => /^on[A-Z]/.test(value);
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, val);
    } else {
      el.setAttribute(key, val);
    }
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
  setupRenderEffect(instace, vnode, container);
}
function setupRenderEffect(instace, vnode, container) {
  // 绑定proxy 使得render函数能使用this
  const { proxy } = instace;
  const subTree = instace.render.call(proxy);

  // vnode => patch
  // vnode => element => mountCompoment
  patch(subTree, container);
  vnode.el = subTree.el;
}
