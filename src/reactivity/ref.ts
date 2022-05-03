import { hasChanged, isObject } from "./shared/index";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  private _rawValue: any;
  public dep;
  public _v_isRef = true
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
      this._rawValue = newValue
      this._value = convert(newValue);
      // 派发更新
      triggerEffects(this.dep);
    }
  }
}
function convert(value) {
  return  isObject(value) ? reactive(value) : value;
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
  return !!value._v_isRef
}

export function unRef(value) {
  return isRef(value) ? value.value : value
}