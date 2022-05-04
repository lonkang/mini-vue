export const app = {
  render() {
    return h("div", "hi " + this.msg);
  },
  setUp() {
    return {
      msg: "mini-vue",
    };
  },
};
