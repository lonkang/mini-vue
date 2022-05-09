import { h } from "../../lib/mini-vue.esm.js";
export const Foo = {
  render() {
    return h(
      "div",
      {},
      'foo' + this.count
    );
  },
  setUp(props) {
    console.log(props)
    props.count ++ 
  },
};
