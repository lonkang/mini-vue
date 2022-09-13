import { transform } from "../src/transform";
import { baseParse } from "../src/parse";
import { generate } from "../src/generate";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hi");
    transform(ast);
    const { code } = generate(ast);
    // 快照
    expect(code).toMatchSnapshot();
  });
});
