import { track, trigger } from "./effect";

export const reactive = (raw) => {
  return new Proxy(raw, {
    get(target, key) {
      const res = Reflect.get(target, key);
      // todo 依赖收集
      track(target, key);
      return res;
    },
    set(target, key, value) {
      const res = Reflect.set(target, key, value);
      // todo 派发更新
      trigger(target, key);
      return res;
    },
  });
};
