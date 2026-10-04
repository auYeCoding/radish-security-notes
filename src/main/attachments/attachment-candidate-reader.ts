import { basename, isAbsolute } from "node:path";

import { findFileViolation } from "@shared/attachments/attachment-limits";
import {
  attachmentFailed,
  attachmentSucceeded,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";

import type { AttachmentFile } from "./attachment-service";
import type { AttachmentSourcePort } from "./attachment-file-port";

/**
 * 一个已通过大小校验, 还没有读取内容的待添加文件.
 */
export interface AttachmentCandidate {
  /**
   * 文件的绝对路径.
   */
  readonly filePath: string;
  /**
   * 文件名, 即附件名称.
   */
  readonly name: string;
  /**
   * 校验时读到的字节数.
   */
  readonly size: number;
}

/**
 * 读取源文件的依赖.
 */
export interface AttachmentCandidateReaderDependencies {
  /**
   * 读取源文件状态与内容的文件系统能力.
   */
  readonly source: AttachmentSourcePort;
  /**
   * 读取文件失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 读取待添加文件: 先逐个核对状态, 再读取内容. 核对只看路径对应的文件状态, 不读内容, 所以过大或
 * 为空的文件不会被读进内存; 文件名只写进失败结果交给界面提示, 不进日志.
 */
export class AttachmentCandidateReader {
  /**
   * 创建读取器.
   * @param dependencies 读取器依赖.
   */
  constructor(
    private readonly dependencies: AttachmentCandidateReaderDependencies,
  ) {}

  /**
   * 按顺序逐个核对文件: 路径必须是绝对路径, 文件必须能访问且是普通文件, 不能是空文件, 不能超过
   * 单个附件的大小上限; 遇到第一个不合规的文件就返回它的原因与文件名.
   * @param filePaths 待添加文件的路径.
   * @returns 全部合规时为待添加文件列表, 否则为失败结果.
   */
  async inspect(
    filePaths: readonly string[],
  ): Promise<AttachmentResult<readonly AttachmentCandidate[]>> {
    const candidates: AttachmentCandidate[] = [];
    for (const filePath of filePaths) {
      const inspected = await this.inspectOne(filePath);
      if (!inspected.ok) {
        return inspected;
      }
      candidates.push(inspected.value);
    }
    return attachmentSucceeded(candidates);
  }

  /**
   * 读取全部待添加文件的内容, 任何一个读取失败就整批失败.
   * @param candidates 已通过核对的待添加文件.
   * @returns 全部读取成功时为已读入内存的文件, 否则为失败结果.
   */
  async readAll(
    candidates: readonly AttachmentCandidate[],
  ): Promise<AttachmentResult<readonly AttachmentFile[]>> {
    const files: AttachmentFile[] = [];
    for (const candidate of candidates) {
      try {
        const content = await this.dependencies.source.readFile(
          candidate.filePath,
        );
        files.push({ name: candidate.name, content });
      } catch (error) {
        this.dependencies.onFailure(error);
        return attachmentFailed("read-failed", candidate.name);
      }
    }
    return attachmentSucceeded(files);
  }

  /**
   * 核对一个文件.
   * @param filePath 文件路径.
   * @returns 合规时为待添加文件, 否则为失败结果.
   */
  private async inspectOne(
    filePath: string,
  ): Promise<AttachmentResult<AttachmentCandidate>> {
    if (!isAbsolute(filePath)) {
      return attachmentFailed("invalid-input");
    }
    const name = basename(filePath);
    try {
      const stats = await this.dependencies.source.statFile(filePath);
      if (!stats.isFile) {
        return attachmentFailed("not-a-file", name);
      }
      const violation = findFileViolation([{ name, size: stats.size }]);
      return violation === undefined
        ? attachmentSucceeded({ filePath, name, size: stats.size })
        : attachmentFailed(violation.reason, violation.fileName);
    } catch (error) {
      this.dependencies.onFailure(error);
      return attachmentFailed("read-failed", name);
    }
  }
}
