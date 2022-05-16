import { h, getCurrentInstance } from "../../lib/mini-vue.esm.js";
export const Foo = {
  name: "Foo",
  render() {
    return h("div", {}, "foo");
  },
  setup() {
    const instace = getCurrentInstance();
    console.log("Foo", instace);
    console.log(1)
    return {}
  },
};
