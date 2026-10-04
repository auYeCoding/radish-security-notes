import { MAX_PATHS_PER_REQUEST } from "@shared/attachments/attachment-limits";

/**
 * 附件参数不合规时的错误信息.
 */
const INVALID_ATTACHMENT_ARGUMENT_MESSAGE = "无效的附件参数";

/**
 * 校验渲染进程传来的条目编号或附件编号是字符串.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的编号.
 * @throws Error 当参数不是字符串时.
 */
export function requireAttachmentIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(INVALID_ATTACHMENT_ARGUMENT_MESSAGE);
  }
  return value;
}

/**
 * 校验渲染进程传来的文件路径列表是由非空字符串组成的有限长数组. 路径是否是绝对路径, 文件是否
 * 存在与合规由导入器判定并带着原因返回, 这里只保证类型与大小.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的路径列表.
 * @throws Error 当参数不是数组, 数组过长, 或有元素不是非空字符串时.
 */
export function requireFilePaths(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_PATHS_PER_REQUEST ||
    !value.every((item) => typeof item === "string" && item.length > 0)
  ) {
    throw new Error(INVALID_ATTACHMENT_ARGUMENT_MESSAGE);
  }
  return [...value] as string[];
}
