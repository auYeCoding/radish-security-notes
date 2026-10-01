import { access } from "node:fs/promises";

/**
 * 判断一个错误是否表示文件不存在.
 * @param error 捕获到的错误.
 * @returns 文件不存在返回 true.
 */
export function isFileMissingError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * 判断文件是否存在.
 * @param file 文件路径.
 * @returns 存在时兑现为 true.
 * @throws Error 当访问文件失败且原因不是文件不存在时.
 */
export async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (isFileMissingError(error)) {
      return false;
    }
    throw error;
  }
}
