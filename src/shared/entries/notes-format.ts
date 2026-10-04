/**
 * 备注可选的格式, 纯文本按原样与换行显示, Markdown 按标准语法渲染. 这是格式取值的唯一定义,
 * 数据库列, 主进程校验与渲染端共用.
 */
export const NOTES_FORMATS = ["plain", "markdown"] as const;

/**
 * 备注的格式.
 */
export type NotesFormat = (typeof NOTES_FORMATS)[number];

/**
 * 新建条目的默认备注格式, 也是迁移之前已有条目的备注格式.
 */
export const DEFAULT_NOTES_FORMAT: NotesFormat = "plain";

/**
 * 判断一个值是不是备注格式.
 * @param value 待判断的值.
 * @returns 是备注格式时为 true.
 */
export function isNotesFormat(value: unknown): value is NotesFormat {
  return NOTES_FORMATS.some((format) => format === value);
}
