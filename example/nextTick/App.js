import {
  h,
  ref,
  getCurrentInstance,
  nextTick,
} from "../../lib/mini-vue.esm.js";
export const App = {
  name: "App",
  render() {
    const button = h("button", { onClick: this.onClick }, "update");
    const p = h("p", {}, "count:" + this.count);
    return h("div", {}, [button, p]);
  },
  setup() {
    const count = ref(1);
    const instance = getCurrentInstance();
    function onClick() {
      for (let index = 0; index < 100; index++) {
        console.log("update");
        count.value = index;
      }
    }
    console.log(instance);
    nextTick(() => {
      console.log(instance);
    });
    return { onClick, count };
  },
};
