import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";
window.self = null;
export const App = {
  name: "App",
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        class: ["red", "green"],
        onClick: function () {
          console.log("click");
        },
        onMousedown: function () {
          console.log("mosedown");
        },
      },
      [
        h("p", { class: "red" }, "hi"),
        h("p", { class: "blue" }, this.msg),
        h(Foo, { count: 1 }),
      ]
    );
  },
  setUp() {
    return {
      msg: "mini-vue-flag",
    };
  },
};
