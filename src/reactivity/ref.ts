import { hasChanged, isObject } from "../shared/index";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  // 获取到的原始值
  private _rawValue: any;
  // 依赖收集
  public dep;
  // 代表是一个ref
  public _v_isRef = true;
  constructor(value) {
    this._rawValue = value;
    // 如果传递过来的是对象的话 就用reactive包裹一下
    this._value = convert(value);
    // this._value =  value
    // 保存原始值
    this.dep = new Set();
  }
  get value() {
    //  依赖收集
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue);
      // 派发更新
      triggerEffects(this.dep);
    }
  }
}
function convert(value) {
  return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImpl(value);
}

export function isRef(value) {
  return !!value._v_isRef;
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}
// 自动解构ref.value
export function proxyRefs(value) {
  return new Proxy(value, {
    // 自动解构 ref.value
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      // 如果当前的target[key]是ref 且新值不是ref 就直接修改ref.value的值
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
