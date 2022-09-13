import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";

describe("parse", () => {
  describe("Interpolation", () => {
    test("simple interpolation", () => {
      // 1. 看看是不是一个 {{ 开头的
      // 2. 是的话，那么就作为 插值来处理
      // 3. 获取内部 message 的内容即可
      const ast = baseParse("{{message}}");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: `message`,
        },
      });
    });
  });
  // 元素类型
  describe("element", () => {
    test("simple div", () => {
      const ast = baseParse("<div></div>");
      const element = ast.children[0];

      expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
        children:[]
      });
    });
  });
  test("simple text", () => {
    const ast = baseParse("some text");
    const text = ast.children[0];

    expect(text).toStrictEqual({
      type: NodeTypes.TEXT,
      content: "some text",
    });
  });

  test("hello world", () => {
    const ast = baseParse("<div>hi,{{message}}</div>");
    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: "div",
      children: [
        {
          type: NodeTypes.TEXT,
          content: "hi,",
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: `message`,
          },
        },
      ],
    });
  });

  test("Nested element", () => {
    const ast = baseParse("<div><p>hi</p>{{message}}</div>");
    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: "div",
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: "p",
          children: [
            {
              type: NodeTypes.TEXT,
              content: "hi",
            },
          ],
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: `message`,
          },
        },
      ],
    });
  });
  test("should throw error when lack end tag  ", () => {
    expect(() => {
      baseParse("<div><span></div>");
    }).toThrow("缺失结束标签：span");
  });
});
