import {mutableHandlers, readonlyHandlers} from './basehandlers'
export function reactive(raw) {
return createActiveObject(raw, mutableHandlers)
}
export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers)
}

function createActiveObject(raw: any, basehandlers) {
  return new Proxy(raw, basehandlers)
}