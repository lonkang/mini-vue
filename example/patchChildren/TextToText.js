import { ref, h } from "../../lib/mini-vue.esm.js";

const nextChildren = "newChildren";
const prevChildren = "oldChildren"

export default {
  name: "TextToText",
  render() {
    const self = this;
    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren);
  },
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;
    return { isChange };
  },
};
