import {createvnode} from './vnode'
export function h(type, props?, children?) {
  return createvnode(type, props, children)
}