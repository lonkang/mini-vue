import {createVNode} from './vnode'
export function h(type, props?, childre?) {
  return createVNode(type, props, childre)
}