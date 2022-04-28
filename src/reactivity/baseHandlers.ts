import { track, trigger } from "./effect";
const get = createGetters()
const set = createSetters()
function createGetters(isReadonly = true){
  return function get(target, key) {
    const res = Reflect.get(target, key);
    if(isReadonly) {
      track(target, key)
    }
    return res;
  }
}
function createSetters(){
  return function get(target, key,value) {
    const res = Reflect.set(target, key,value);
    trigger(target,key)
    return res;
  }
}
export const mutableHandlers = {
  get,
  set
}
export const  readonlyHandlers = {
  get: createGetters(false),
  set: function(target, key, value) {
    // const res = Reflect.set(target, key,value);
    // return res;
    console.warn(`key:${key}   set 失败`)
    return true
  }
}
