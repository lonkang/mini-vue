import { h } from "../../lib/mini-vue.esm.js";
// import ArrayToText from "./ArrayToText.js";
// import TextToText from "./TextToText.js";
// import TextToArray from "./TextToArray.js";
import ArrayToArray from "./ArrayToArray.js";

export const App = {
  name: "App",
  render() {
    return h("div", { tId: 1 }, [
      h("p", {}, "主页"),
      // 老的是array新的是text
      // h(ArrayToText),
      // 老的是text新的是text
      // h(TextToText),
      // 老的是text新的是array
      // h(TextToArray),
      // 老的是array新的是array
      h(ArrayToArray)
    ]);
  },
  setup() {},
};
