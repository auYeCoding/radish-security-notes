/**
 * 导出支持的文件格式的定义表, 每种格式一行, 顺序就是选择界面里的顺序. 这是格式取值的唯一定义:
 * 格式的键类型与键列表都由它派生, 新增格式时在这里加一行.
 */
const EXPORT_FORMAT_TABLE = [
  { key: "native" },
  { key: "bitwardenJson" },
  { key: "browserCsv" },
] as const;

/**
 * 一种导出文件格式的键: 本应用完整格式, Bitwarden JSON, 浏览器密码 CSV.
 */
export type ExportFormatKey = (typeof EXPORT_FORMAT_TABLE)[number]["key"];

/**
 * 全部导出格式的键, 顺序就是选择界面里的顺序. 序列化器的登记, 进程边界校验与渲染端的格式选择
 * 共用.
 */
export const EXPORT_FORMAT_KEYS: readonly ExportFormatKey[] =
  EXPORT_FORMAT_TABLE.map((format) => format.key);

/**
 * 导出对话框默认选中的格式: 能完整还原全部数据的本应用格式.
 */
export const DEFAULT_EXPORT_FORMAT: ExportFormatKey = "native";

/**
 * 判断一个值是否是导出格式的键.
 * @param value 待判断的值.
 * @returns 是格式的键时返回 true.
 */
export function isExportFormatKey(value: unknown): value is ExportFormatKey {
  return EXPORT_FORMAT_KEYS.some((key) => key === value);
}
