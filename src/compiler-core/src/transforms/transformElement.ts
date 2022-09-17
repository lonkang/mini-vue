import { createVNodeCall, NodeTypes } from "../ast";

// 处理元素类型
export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      // tag
      const vnodeTag = `'${node.tag}'`;
      // props
      let vnodeProps;
      // children
      const children = node.children;
      let vnodeChildren = children[0];

      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      );
    };
  }
}
