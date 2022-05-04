import { ReactiveEffect } from "./effect";

class computedRefImp {
  private _getters: any;
  private _dirty: boolean = true;
  private _value: any;
  private _effect: any;
  constructor(getters) {
    this._getters = getters;
    this._effect = new ReactiveEffect(getters, () => {
      // 响应式数据更新之后 不重新执行getter 只会把_dirty设置为true
      if(!this._dirty) {
        this._dirty = true
      }
    })
  }
  get value() {
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getters) {
  return new computedRefImp(getters);
}
