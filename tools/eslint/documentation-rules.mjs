/**
 * 必须有文档注释的声明节点选择器. 只匹配程序顶层的声明, 类成员与接口成员,
 * 避免要求函数体内的嵌套声明写注释, 否则与 "函数体内无注释" 冲突. 默认导出一个
 * 标识符 (`export default App;`) 只是引用已有文档的声明, 不再要求注释.
 * @type {readonly string[]}
 */
export const DOCUMENTED_CONTEXTS = [
  "Program > ExportNamedDeclaration[declaration]",
  "Program > ExportDefaultDeclaration[declaration.type!='Identifier']",
  "Program > :matches(FunctionDeclaration, VariableDeclaration, ClassDeclaration, TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration)",
  "TSEnumMember",
  "TSPropertySignature",
  "TSMethodSignature",
  "PropertyDefinition",
];

/**
 * 文档注释规则集合: 声明必须有文档注释, 注释不重复类型信息, 不使用单行块注释,
 * 参数与返回值必须有说明, 参数说明前不加连字符.
 * @type {import("eslint").Linter.RulesRecord}
 */
export const documentationRules = {
  "jsdoc/require-jsdoc": [
    "error",
    {
      enableFixer: false,
      require: {
        FunctionDeclaration: false,
        ClassDeclaration: false,
        MethodDefinition: true,
      },
      contexts: DOCUMENTED_CONTEXTS,
    },
  ],
  "jsdoc/no-types": "error",
  "jsdoc/require-param": ["error", { checkDestructured: false }],
  "jsdoc/require-returns": "error",
  "jsdoc/require-hyphen-before-param-description": ["error", "never"],
  "jsdoc/multiline-blocks": [
    "error",
    { noSingleLineBlocks: true, singleLineTags: [] },
  ],
};
