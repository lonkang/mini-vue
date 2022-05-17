import { ShapeFlags } from "../shared/ShapeFlags";
import { createCompomentInstace, setupComponent } from "./compoment";
import { Fragment, Text } from "./vnode";

export function render(vnode, container) {
  patch(vnode, container, null);
}
function patch(vnode, container, parentComponent) {
  // todo 判断vnode是不是一个element
  // 是element就处理element
  // 处理组件
  const { type, ShapeFlag } = vnode;
  switch (type) {
    case Fragment:
      processFragment(vnode, container, parentComponent);
      break;
    case Text:
      processText(vnode, container);
      break;
    default:
      if (ShapeFlag & ShapeFlags.ELEMENT) {
        // 元素类型
        processElement(vnode, container, parentComponent);
      } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 组件类型
        processComponent(vnode, container, parentComponent);
      }
      break;
  }
}
function processFragment(vnode, container, parentComponent) {
  const { children } = vnode;
  mountChildren(children, container, parentComponent);
}
function processText(vnode, container) {
  const { children } = vnode;
  const textNode = (vnode.el = document.createTextNode(children));
  container.append(textNode);
}
function processElement(vnode, container, parentComponent) {
  mountElement(vnode, container, parentComponent);
}
function mountElement(vnode, container, parentComponent) {
  const { type, children, props, ShapeFlag } = vnode;

  const el = (vnode.el = document.createElement(type));

  if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el, parentComponent);
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
function mountChildren(children, container, parentComponent) {
  children.forEach((v) => {
    patch(v, container, parentComponent);
  });
}

function processComponent(vnode, container, parentComponent) {
  mountCompoment(vnode, container, parentComponent);
}
function mountCompoment(vnode: any, container, parentComponent) {
  const instace = createCompomentInstace(vnode, parentComponent);
  setupComponent(instace);
  setupRenderEffect(instace, vnode, container);
}
function setupRenderEffect(instace, vnode, container) {
  // 绑定proxy 使得render函数能使用this
  const { proxy } = instace;
  const subTree = instace.render.call(proxy);

  // vnode => patch
  // vnode => element => mountCompoment
  patch(subTree, container, instace);
  vnode.el = subTree.el;
}
