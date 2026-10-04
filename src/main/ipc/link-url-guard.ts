/**
 * 校验渲染进程传来的要打开的链接地址是字符串. 地址是否符合外部链接策略由打开器判定.
 * @param url 渲染进程传来的值.
 * @returns 校验通过的链接地址.
 * @throws Error 当参数不是字符串时.
 */
export function requireExternalLinkUrl(url: unknown): string {
  if (typeof url !== "string") {
    throw new Error("无效的链接地址");
  }
  return url;
}
