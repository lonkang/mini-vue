// 组件 provide 和 inject 功能
import { h, provide, inject } from "../../lib/mini-vue.esm.js";

const ProviderOne = {
  setup() {
    provide("foo", "foo");
    provide("bar", "bar");
    return {};
  },
  render() {
    return h("div", {}, [h("p", {}, "provide"), h(ProviderTwo)]);
  },
};
const ProviderTwo = {
  setup() {
    // provide("foo", "foo");
    // provide("bar", "bar");
    provide("foo", "fooTwo");
    const foo = inject("foo");
    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [h("p", {}, `ProviderTwo: ${this.foo}`), h(Consumer)]);
  },
};

const Consumer = {
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz", "defalut");
    const fn = inject("baz", () => "fn");
    return {
      foo,
      bar,
      baz,
      fn,
    };
  },
  render() {
    return h(
      "div",
      {},
      `Consumer: - ${this.foo} - ${this.bar}- ${this.baz}- ${this.fn}`
    );
  },
};

export default {
  name: "App",
  setup() {
    // return () => h("div", {}, [h("p", {}, "apiInject"), h(ProviderOne)]);
    return {};
  },
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(ProviderOne)]);
  },
};
