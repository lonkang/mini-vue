import { NodeTypes } from "./ast";

export const baseParse = (content: string) => {
  const context = createParseContext(content);
  return createRoot(parseChildren(context));
};
function parseChildren(context) {
  const nodes: any = [];
  let node;
  // if (context.source.startsWith("{{")) {
  node = parseInterpolation(context);
  // }
  nodes.push(node);
  return nodes;
}

function parseInterpolation(context: any) {
  // 1. 先获取到结束的index
  // 2. 通过 closeIndex - startIndex 获取到内容的长度 contextLength
  // 3. 通过 slice 截取内容
  // }} 是插值的关闭
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  // 让代码前进2个长度，可以把 {{ 干掉
  advanceBy(context, openDelimiter.length);
  console.log(context, "context");

  const rawContentLength = closeIndex - openDelimiter.length;
  const rawContent = context.source.slice(0, rawContentLength);
  const content = rawContent.trim();

  // 最后在让代码前进2个长度，可以把 }} 干掉
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}
function advanceBy(content, length: number) {
  content.source = content.source.slice(length);
}

function createParseContext(content: string) {
  return {
    source: content,
  };
}

function createRoot(children) {
  return {
    children,
  };
}
