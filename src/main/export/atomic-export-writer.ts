import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { ExportFilePort } from "./export-ports";

/**
 * 原子写出一个文件的参数.
 */
export interface AtomicWriteRequest {
  /**
   * 文件系统能力.
   */
  readonly file: ExportFilePort;
  /**
   * 目标文件的路径.
   */
  readonly targetPath: string;
  /**
   * 要写出的字节流.
   */
  readonly source: Readable;
  /**
   * 中止信号, 触发后停止写出并清理.
   */
  readonly signal: AbortSignal;
  /**
   * 字节流全部写进临时文件之后, 刷盘与改名之前调用.
   */
  readonly onWritten: () => void;
}

/**
 * 把字节流原子地写成目标文件: 先写同目录的临时文件, 刷盘后改名替换目标. 写入失败, 被中止或改名
 * 失败时都关闭并删除临时文件, 已存在的目标文件保持原样, 不会出现写了一半的目标文件. 清理本身
 * 失败时不覆盖原来的错误.
 * @param request 写出参数.
 * @returns 写出的字节数; 失败或被中止时拒绝, 原因是底层的错误.
 */
export async function writeFileAtomically(
  request: AtomicWriteRequest,
): Promise<number> {
  const { file, targetPath, source, signal } = request;
  const temporary = await file.createTemporaryFile(targetPath);
  try {
    await pipeline(source, temporary.stream, { signal });
    request.onWritten();
    await temporary.finalize();
    const size = temporary.bytesWritten();
    await file.replaceTarget(temporary.path, targetPath);
    return size;
  } catch (error) {
    await temporary.abandon();
    await file.removeFile(temporary.path).catch(() => undefined);
    throw error;
  }
}
