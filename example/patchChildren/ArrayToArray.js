import { h, ref } from "../../lib/mini-vue.esm.js";

// AB -> ABC
// const prevChildren = [
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
// ];
// const nextChildren = [
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
//   h("span", { key: "C" }, "C"),
//   h("span", { key: "D" }, "D"),
// ];
// BC -> ABC
// const prevChildren = [
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
// ];
// const nextChildren = [
//   h("span", { key: "D" }, "D"),
//   h("span", { key: "C" }, "C"),
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
// ];

// // ABC -> AB
// const prevChildren=  [h('span', { key: 'A' }, 'A'), h('span', { key: 'B' }, 'B'), h('span', { key: 'C' }, 'C')]
// const nextChildren =  [h('span', { key: 'A' }, 'A'), h('span', { key: 'B' }, 'B')]

// // ABC -> BC
// const prevChildren = [
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
//   h("span", { key: "C" }, "C"),
// ];
// const nextChildren = [
//   h("span", { key: "B" }, "B"),
//   h("span", { key: "C" }, "C"),
// ];

// // ABCEDFG -> ABECFG
// {
const prevChildren = [
  h("span", { key: "A" }, "A"),
  h("span", { key: "B" }, "B"),
  h("span", { key: "C", id: 'c-prev' }, "C"),
  h("span", { key: "E" }, "E"),
  h("span", { key: "D" }, "D"),
  h("span", { key: "F" }, "F"),
  h("span", { key: "G" }, "G"),
];
const nextChildren = [
  h("span", { key: "A" }, "A"),
  h("span", { key: "B" }, "B"),
  h("span", { key: "E" }, "E"),
  h("span", { key: "C", id: 'c-next' }, "C"),
  h("span", { key: "F" }, "F"),
  h("span", { key: "G" }, "G"),
];

export default {
  name: "ArrayToText",
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
