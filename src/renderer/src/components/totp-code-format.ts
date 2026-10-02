/**
 * 把验证码分成前后两半显示, 中间一个空格: 6 位显示为 123 456, 8 位显示为 1234 5678. 只用于
 * 显示, 复制的内容仍是不带空格的纯数字.
 * @param code 纯数字的验证码.
 * @returns 分组后的显示文本.
 */
export function groupTotpCode(code: string): string {
  const halfLength = Math.ceil(code.length / 2);
  return `${code.slice(0, halfLength)} ${code.slice(halfLength)}`;
}
