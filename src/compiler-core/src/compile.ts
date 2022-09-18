import { generate } from "./codegen";
import { baseParse } from "./parse";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

export function baseCompile(template) {
  // 将目标编译成ast
  const ast = baseParse(template);
  // 2. 给 ast 进行修改
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  });
  // 生成render函数代码
  return generate(ast);
}
