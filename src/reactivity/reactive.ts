import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from './baseHandlers'


export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__V_isReadonly"
}
export function reactive(raw) {
return createActiveObject(raw, mutableHandlers)
}
export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers)
}
export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandlers)
}

function createActiveObject(raw: any, basehandlers) {
  return new Proxy(raw, basehandlers)
}
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE]
}
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isProxy(raw) {
  return isReactive(raw) || isReadonly(raw)
}