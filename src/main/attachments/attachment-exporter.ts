import { join } from "node:path";

import {
  attachmentFailed,
  attachmentSucceeded,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";
import type { AttachmentSaveOutcome } from "@shared/attachments/attachment-types";

import type { AttachmentDialogLabels } from "./attachment-dialog-labels";
import type {
  AttachmentDialogPort,
  AttachmentSinkPort,
} from "./attachment-file-port";
import type { AttachmentService } from "./attachment-service";

/**
 * 写出临时文件的名称后缀.
 */
const PARTIAL_FILE_SUFFIX = ".part";

/**
 * 另存为的依赖.
 */
export interface AttachmentExporterDependencies {
  /**
   * 附件服务, 负责读出附件.
   */
  readonly service: AttachmentService;
  /**
   * 系统对话框.
   */
  readonly dialogs: AttachmentDialogPort;
  /**
   * 写出文件的文件系统能力.
   */
  readonly sink: AttachmentSinkPort;
  /**
   * 按当前界面语言读取对话框文案.
   */
  readonly readDialogLabels: () => AttachmentDialogLabels;
  /**
   * 保存对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
  /**
   * 生成临时文件名里的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 写出失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 附件另存为: 让用户在系统保存对话框里选位置, 再把附件内容原样写出. 先写到同目录的临时文件, 写完
 * 再改名到目标路径, 失败时删掉临时文件, 不会在目标位置留下写了一半的文件.
 */
export class AttachmentExporter {
  /**
   * 创建另存为执行器.
   * @param dependencies 执行器依赖.
   */
  constructor(private readonly dependencies: AttachmentExporterDependencies) {}

  /**
   * 把附件另存为用户选的文件.
   * @param attachmentId 附件编号.
   * @returns 已保存, 或用户取消对话框; 没有这个附件, 保险库未解锁, 数据库出错或写出失败时为失败结果.
   */
  async saveAs(
    attachmentId: string,
  ): Promise<AttachmentResult<AttachmentSaveOutcome>> {
    const { service, dialogs } = this.dependencies;
    const meta = service.findMeta(attachmentId);
    if (!meta.ok) {
      return meta;
    }
    const targetPath = await dialogs.showSaveDialog({
      title: this.dependencies.readDialogLabels().saveTitle,
      defaultPath: join(this.dependencies.defaultDirectory, meta.value.name),
    });
    if (targetPath === undefined) {
      return attachmentSucceeded("cancelled");
    }
    const stored = service.read(attachmentId);
    return stored.ok ? this.write(targetPath, stored.value.content) : stored;
  }

  /**
   * 写出文件: 先写临时文件再改名, 失败时删掉临时文件.
   * @param targetPath 目标路径.
   * @param content 附件内容.
   * @returns 已保存或写出失败.
   */
  private async write(
    targetPath: string,
    content: Buffer,
  ): Promise<AttachmentResult<AttachmentSaveOutcome>> {
    const { sink, createIdentifier, onFailure } = this.dependencies;
    const partialPath = `${targetPath}.${createIdentifier()}${PARTIAL_FILE_SUFFIX}`;
    try {
      await sink.writeFile(partialPath, content);
      await sink.renameFile(partialPath, targetPath);
      return attachmentSucceeded("saved");
    } catch (error) {
      onFailure(error);
      await this.discard(partialPath);
      return attachmentFailed("write-failed");
    }
  }

  /**
   * 尽力删除临时文件, 删除失败也只通知回调, 不再向上抛.
   * @param partialPath 临时文件路径.
   * @returns 删除尝试结束后兑现.
   */
  private async discard(partialPath: string): Promise<void> {
    try {
      await this.dependencies.sink.removeFile(partialPath);
    } catch (error) {
      this.dependencies.onFailure(error);
    }
  }
}
