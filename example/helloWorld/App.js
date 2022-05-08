import { h } from "../../lib/mini-vue.esm.js";
export const App = {
  render() {
    return h(
      "div",
      {
        id: "root",
        class: ["red", "green"],
      },
      [h("p", { class: "red" }, "hi"), h("p", { class: "blue" }, this.msg)]
    );
  },
  setUp() {
    return {
      msg: "mini-vue",
    };
  },
};
