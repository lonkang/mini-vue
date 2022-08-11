import { ref, h } from "../../lib/mini-vue.esm.js";
import { Child } from "./Child.js";
export const App = {
  name: "App",
  setup() {
    const count = ref(1);
    const msg = ref("123");
    window.msg = msg;
    const changeChildProps = () => {
      msg.value = "456";
    };

    const changeCount = () => {
      count.value++;
    };
    return {
      count,
      msg,
      changeCount,
      changeChildProps,
    };
  },
  render() {
    return h("div", { id: "root" }, [
      h("div", {}, "你好"),
      h("p", {}, "count: " + this.count),
      h(
        "button",
        {
          onClick: this.changeCount,
        },
        "change self count"
      ),
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "update child props"
      ),
      h(Child, {
        msg: this.msg,
      }),
    ]);
  },
};
