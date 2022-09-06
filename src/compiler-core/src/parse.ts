import { NodeTypes } from "./ast";
const enum TagsType {
  Start,
  End,
}
export const baseParse = (content: string) => {
  const context = createParseContext(content);
  return createRoot(parseChildren(context, []));
};
function parseChildren(context, ancestors) {
  console.log("开始解析 children");
  const nodes: any = [];

  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;

    if (startsWith(s, "{{")) {
      // 看看如果是 {{ 开头的话，那么就是一个插值， 那么去解析他
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }

  return nodes;
}

function isEnd(context: any, ancestors) {
  // 检测标签的节点
  // 如果是结束标签的话，需要看看之前有没有开始标签，如果有的话，那么也应该结束
  // 这里的一个 edge case 是 <div><span></div>
  // 像这种情况下，其实就应该报错
  const s = context.source;
  if (context.source.startsWith("</")) {
    // 从后面往前面查
    // 因为便签如果存在的话 应该是 ancestors 最后一个元素
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }

  // 看看 context.source 还有没有值
  return !context.source;
}

function startsWithEndTagOpen(source: string, tag: string) {
  // 1. 头部 是不是以  </ 开头的
  // 2. 看看是不是和 tag 一样
  return (
    startsWith(source, "</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}
function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
}

function parseText(context) {
  console.log("解析 text", context);

  // endIndex 应该看看有没有对应的 <
  // 比如 hello</div>
  // 像这种情况下 endIndex 就应该是在 o 这里
  // {
  const endTokens = ["<", "{{"];
  let endIndex = context.source.length;

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    // endIndex > index 是需要要 endIndex 尽可能的小
    // 比如说：
    // hi, {{123}} <div></div>
    // 那么这里就应该停到 {{ 这里，而不是停到 <div 这里
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}
function parseTextData(context, length) {
  console.log("解析 textData");
  // 1. 直接返回 context.source
  // 从 length 切的话，是为了可以获取到 text 的值（需要用一个范围来确定）
  const rawText = context.source.slice(0, length);

  // 2. 移动光标
  advanceBy(context, length);

  return rawText;
}

function parseElement(context, ancestors) {
  // 1.解析tag
  const element: any = parseTag(context, TagsType.Start);
  // 2. 解析children
  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  ancestors.pop();

  // 解析 end tag 是为了检测语法是不是正确的
  // 检测是不是和 start tag 一致
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagsType.End);
  } else {
    throw new Error(`缺失结束标签：${element.tag}`);
  }
  return element;
}
function parseTag(context, type: TagsType) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  // 删除处理完成的代码
  advanceBy(context, match[0].length);
  // 删除>
  advanceBy(context, 1);
  if (type === TagsType.End) return;
  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
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
  const rawContent = parseTextData(context, rawContentLength);
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
    type: NodeTypes.ROOT,
    children,
  };
}
