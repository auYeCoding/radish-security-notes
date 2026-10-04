/**
 * 允许交给系统打开的外部链接协议, 带结尾冒号, 与 `URL.protocol` 的写法一致. 这是允许协议的唯一
 * 定义: 渲染端用它决定链接能不能点, 主进程用它决定链接能不能打开.
 */
export const ALLOWED_EXTERNAL_LINK_PROTOCOLS: readonly string[] = [
  "http:",
  "https:",
  "mailto:",
];

/**
 * 判断一个地址是不是允许打开的外部链接: 必须是能解析的绝对地址, 且协议在允许范围内. 相对路径,
 * 锚点, `javascript:`, `file:`, `data:` 与自定义协议都不允许.
 * @param url 待判断的地址.
 * @returns 允许打开时为 true.
 */
export function isAllowedExternalLink(url: string): boolean {
  if (!URL.canParse(url)) {
    return false;
  }
  return ALLOWED_EXTERNAL_LINK_PROTOCOLS.includes(new URL(url).protocol);
}
