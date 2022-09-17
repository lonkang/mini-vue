import { CREATE_ELEMENT_VNODE } from "./runtimeHelper";

export const enum NodeTypes {
  ROOT, // 根节点
  TEXT, // 文本  例如 用户就写了一共 'hi'
  ELEMENT, // 元素 例如 <div></div>
  INTERPOLATION, // 插值 例如{{message}}
  SIMPLE_EXPRESSION, // 插值类型中的表达式类型 也就是{{message}} 中的message
  COMPOUND_EXPRESSION, // 文本和插值的联合类型 例如 'hi, {{message}}'
}
// 创建元素类型的方法
export function createVNodeCall(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE);
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  };
}
