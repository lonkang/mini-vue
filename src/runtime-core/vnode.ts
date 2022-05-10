import { isObject } from './../shared/index';
import { ShapeFlags } from "../shared/ShapeFlags";

export function createvnode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    ShapeFlag: getShapeFlag(type),
  };

  // 基于 children 再次设置 shapeFlag
  if (typeof children === "string") {
    vnode.ShapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.ShapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }
  if (vnode.ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if(isObject(children)) {
      vnode.ShapeFlag |= ShapeFlags.SLOT_CHILDREN;
    }
  }

  return vnode;
}
// 基于 type 来判断是什么类型的组件
function getShapeFlag(type: any) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
