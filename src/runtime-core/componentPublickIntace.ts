const publicPropertiesMap = {
  // 当用户调用 instance.proxy.$emit 时就会触发这个函数
  // i 就是 instance 的缩写 也就是组件实例对象
  $el: (i) => i.vnode.el,
};
export const publicInstaceProxyHandlers = {
  get({ _: instance }, key) {
    // 先实现 setUp中返回的setUpState
    const { setupState } = instance;
    if (key in setupState) {
      return setupState[key];
    }
    const publicGetters = publicPropertiesMap[key];
    if (publicGetters) {
      return publicGetters(instance);
    }
  },
};