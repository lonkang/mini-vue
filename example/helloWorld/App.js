import { h } from "../../lib/mini-vue.esm.js";
window.self = null;
export const App = {
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
      [h("p", { class: "red" }, "hi"), h("p", { class: "blue" }, this.msg)]
    );
  },
  setUp() {
    return {
      msg: "mini-vue-flag",
    };
  },
};
