import { NodeTypes } from "../ast";

// 处理插值类型
export function transformExpression(node) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content);
  }
}
function processExpression(node) {
  node.content = `_ctx.${node.content}`;
  return node;
}
