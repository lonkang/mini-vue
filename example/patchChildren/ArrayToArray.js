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
// const prevChildren = [
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
//   h("span", { key: "C", id: 'c-prev' }, "C"),
//   h("span", { key: "E" }, "E"),
//   h("span", { key: "D" }, "D"),
//   h("span", { key: "F" }, "F"),
//   h("span", { key: "G" }, "G"),
// ];
// const nextChildren = [
//   h("span", { key: "A" }, "A"),
//   h("span", { key: "B" }, "B"),
//   h("span", { key: "E" }, "E"),
//   h("span", { key: "C", id: 'c-next' }, "C"),
//   h("span", { key: "F" }, "F"),
//   h("span", { key: "G" }, "G"),
// ];

// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// 综合例子
// A,B(C,D,E,Z)F,G
// A,B(D,C,Y,E)F,G
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "Z" }, "Z"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];

const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "C" }, "C"),
  h("p", { key: "Y" }, "Y"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];
export default {
  name: "ArrayToArray",
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
