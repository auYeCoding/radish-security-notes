/**
 * 禁止在函数体内写注释的 ESLint 规则. 函数声明, 函数表达式与箭头函数的函数体
 * 内出现的任何注释都会被报告, 嵌套函数里的同一条注释只报告一次.
 * @type {import("eslint").Rule.RuleModule}
 */
export const noCommentsInFunctionBody = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止在函数体内写注释, 用命名与结构表达逻辑.",
    },
    schema: [],
    messages: {
      forbidden: "函数体内不允许出现注释.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const reported = new Set();

    const checkFunction = (node) => {
      for (const comment of sourceCode.getCommentsInside(node.body)) {
        if (reported.has(comment)) {
          continue;
        }
        reported.add(comment);
        context.report({ loc: comment.loc, messageId: "forbidden" });
      }
    };

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};
