/**
 * 把备份生成的时间格式化成界面语言的日期与时间. 时间文本无法解析时原样返回, 不让界面因此出错.
 * @param isoText ISO 8601 时间文本.
 * @param language 当前界面语言, 决定写法.
 * @returns 形如 "2026年10月5日 20:30" 的文本.
 */
export function formatRestoreTime(isoText: string, language: string): string {
  const moment = new Date(isoText);
  if (Number.isNaN(moment.getTime())) {
    return isoText;
  }
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(moment);
}
