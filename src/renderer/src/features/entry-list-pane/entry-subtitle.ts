/**
 * 类型名与账号之间的分隔符.
 */
const SUBTITLE_SEPARATOR = " · ";

/**
 * 拼出列表项第二行的文案: "类型名 · 账号", 没有账号时只有类型名.
 * @param typeName 当前语言的类型名.
 * @param account 条目的账号, 没有账号字段或没有填写时为空串.
 * @returns 第二行文案.
 */
export function formatEntrySubtitle(typeName: string, account: string): string {
  return account === ""
    ? typeName
    : `${typeName}${SUBTITLE_SEPARATOR}${account}`;
}
