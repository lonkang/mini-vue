import { h, renderSlots } from "../../lib/mini-vue.esm.js";
export const Foo = {
  render() {
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    return h("div", {}, [
      renderSlots(this.$slots, "header", { age: 1 }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
  setUp(props, { emit }) {
    return {};
  },
};
