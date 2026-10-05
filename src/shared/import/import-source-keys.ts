/**
 * 导入支持的来源与文件格式的定义表, 每种格式一行, 顺序就是选择界面里的顺序. 这是来源取值的
 * 唯一定义: 来源的键类型与键列表都由它派生, 新增来源时在这里加一行.
 */
const IMPORT_SOURCE_TABLE = [
  { key: "bitwardenJson", fileKind: "json" },
  { key: "bitwardenCsv", fileKind: "csv" },
  { key: "browserCsv", fileKind: "csv" },
  { key: "keepassxcCsv", fileKind: "csv" },
] as const;

/**
 * 一种导入来源与文件格式的键.
 */
export type ImportSourceKey = (typeof IMPORT_SOURCE_TABLE)[number]["key"];

/**
 * 导入文件的种类, 决定选择文件对话框里的类型过滤.
 */
export type ImportFileKind = "json" | "csv";

/**
 * 一种导入来源的描述.
 */
export interface ImportSourceDescriptor {
  /**
   * 来源与格式的键.
   */
  readonly key: ImportSourceKey;
  /**
   * 导出文件的种类.
   */
  readonly fileKind: ImportFileKind;
}

/**
 * 全部导入来源的描述, 顺序就是选择界面里的顺序.
 */
export const IMPORT_SOURCES: readonly ImportSourceDescriptor[] =
  IMPORT_SOURCE_TABLE;

/**
 * 全部导入来源与文件格式的键, 顺序与 IMPORT_SOURCES 一致. 主进程的适配器登记, 进程边界校验与
 * 渲染端的来源选择共用.
 */
export const IMPORT_SOURCE_KEYS: readonly ImportSourceKey[] =
  IMPORT_SOURCES.map((source) => source.key);

/**
 * 判断一个值是否是导入来源的键.
 * @param value 待判断的值.
 * @returns 是来源的键时返回 true.
 */
export function isImportSourceKey(value: unknown): value is ImportSourceKey {
  return IMPORT_SOURCE_KEYS.some((key) => key === value);
}

/**
 * 按来源的键取它的描述.
 * @param key 来源的键.
 * @returns 来源的描述.
 */
export function describeImportSource(
  key: ImportSourceKey,
): ImportSourceDescriptor {
  const source = IMPORT_SOURCES.find((candidate) => candidate.key === key);
  if (source === undefined) {
    throw new Error("未登记的导入来源");
  }
  return source;
}

/**
 * 导入文件种类对应的文件扩展名, 不含点号.
 */
export const IMPORT_FILE_EXTENSIONS: Readonly<
  Record<ImportFileKind, readonly string[]>
> = {
  json: ["json"],
  csv: ["csv"],
};
