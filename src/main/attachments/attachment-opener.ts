import { canOpenAttachment } from "@shared/attachments/attachment-kind";
import {
  attachmentFailed,
  attachmentSucceeded,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";

import type { AttachmentShellPort } from "./attachment-file-port";
import type { AttachmentService } from "./attachment-service";
import type { TemporaryCopyStore } from "./temporary-copy-store";

/**
 * 打开附件的依赖.
 */
export interface AttachmentOpenerDependencies {
  /**
   * 附件服务, 负责读出附件.
   */
  readonly service: AttachmentService;
  /**
   * 明文临时副本存储.
   */
  readonly copies: TemporaryCopyStore;
  /**
   * 用系统默认程序打开文件的能力.
   */
  readonly shell: AttachmentShellPort;
  /**
   * 创建副本或打开失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 附件打开器: 把附件解密成只读的临时副本, 再交给系统默认程序打开. 系统打开可执行类文件就是直接运行
 * 它, 所以这类附件在读出内容之前就被拒绝, 只能另存为.
 */
export class AttachmentOpener {
  /**
   * 创建打开器.
   * @param dependencies 打开器依赖.
   */
  constructor(private readonly dependencies: AttachmentOpenerDependencies) {}

  /**
   * 用系统默认程序打开一个附件.
   * @param attachmentId 附件编号.
   * @returns 已交给系统打开; 没有这个附件, 是可执行类, 保险库未解锁, 写副本失败或系统打开失败时为
   * 失败结果.
   */
  async open(attachmentId: string): Promise<AttachmentResult<undefined>> {
    const { service, copies, shell, onFailure } = this.dependencies;
    const meta = service.findMeta(attachmentId);
    if (!meta.ok) {
      return meta;
    }
    if (!canOpenAttachment(meta.value.name)) {
      return attachmentFailed("not-openable");
    }
    const stored = service.read(attachmentId);
    if (!stored.ok) {
      return stored;
    }
    try {
      const filePath = await copies.create(
        meta.value.name,
        stored.value.content,
      );
      const message = await shell.openPath(filePath);
      return message === ""
        ? attachmentSucceeded(undefined)
        : attachmentFailed("open-failed");
    } catch (error) {
      onFailure(error);
      return attachmentFailed("write-failed");
    }
  }
}
