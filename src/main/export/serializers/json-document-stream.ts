/**
 * 一个 JSON 文档的组成: 若干先写出的顶层属性, 然后是一个按条目逐个写出的数组属性.
 */
export interface JsonDocumentParts {
  /**
   * 先写出的顶层属性, 按顺序.
   */
  readonly headProperties: readonly (readonly [string, unknown])[];
  /**
   * 最后写出的数组属性的名称.
   */
  readonly listName: string;
  /**
   * 数组里的条目, 被消费时才生成.
   */
  readonly items: Iterable<unknown>;
}

/**
 * 把一个 JSON 文档逐段生成成文本: 顶层属性各占一行, 数组里每个条目占一行, 条目是紧凑的 JSON.
 * 整个文档不会一次拼成一个大字符串, 每写出一个条目就调用一次回调, 调用方借它报告进度与让出
 * 事件循环.
 * @param parts 文档的组成.
 * @param onItem 每写出一个条目后调用, 回调拒绝时生成中止.
 * @yields 文档的文本片段, 依次拼接就是完整的 JSON.
 */
export async function* streamJsonDocument(
  parts: JsonDocumentParts,
  onItem: () => Promise<void>,
): AsyncGenerator<string> {
  yield "{\n";
  for (const [name, value] of parts.headProperties) {
    yield `  ${JSON.stringify(name)}: ${JSON.stringify(value)},\n`;
  }
  yield `  ${JSON.stringify(parts.listName)}: [`;
  let count = 0;
  for (const item of parts.items) {
    yield `${count === 0 ? "\n" : ",\n"}    ${JSON.stringify(item)}`;
    count += 1;
    await onItem();
  }
  yield `${count === 0 ? "" : "\n  "}]\n}\n`;
}
