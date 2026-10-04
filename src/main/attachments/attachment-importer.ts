import {
  attachmentFailed,
  attachmentSucceeded,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";
import type { AttachmentAddOutcome } from "@shared/attachments/attachment-types";

import type { AttachmentCandidateReader } from "./attachment-candidate-reader";
import type { AttachmentDialogLabels } from "./attachment-dialog-labels";
import type { AttachmentDialogPort } from "./attachment-file-port";
import type { AttachmentService } from "./attachment-service";

/**
 * 导入附件的依赖.
 */
export interface AttachmentImporterDependencies {
  /**
   * 附件服务, 负责容量预检与写库.
   */
  readonly service: AttachmentService;
  /**
   * 源文件读取器.
   */
  readonly reader: AttachmentCandidateReader;
  /**
   * 系统对话框.
   */
  readonly dialogs: AttachmentDialogPort;
  /**
   * 按当前界面语言读取对话框文案.
   */
  readonly readDialogLabels: () => AttachmentDialogLabels;
  /**
   * 选择文件对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
}

/**
 * 附件导入器: 把磁盘上的文件添加为条目的附件. 流程是先核对每个文件的状态与大小, 再预检条目的个数
 * 与总大小上限 (避免把过大的批次读进内存), 然后读取内容, 最后交给附件服务在一个事务里写库; 任何
 * 一步失败整次都不添加. 文件内容只在主进程里经过, 不交给渲染端.
 */
export class AttachmentImporter {
  /**
   * 创建导入器.
   * @param dependencies 导入器依赖.
   */
  constructor(private readonly dependencies: AttachmentImporterDependencies) {}

  /**
   * 弹出选择文件对话框 (可多选), 把所选文件添加为条目的附件.
   * @param entryId 条目编号.
   * @returns 用户取消对话框时为 cancelled, 否则为导入结果.
   */
  async importFromDialog(
    entryId: string,
  ): Promise<AttachmentResult<AttachmentAddOutcome>> {
    const filePaths = await this.dependencies.dialogs.showOpenDialog({
      title: this.dependencies.readDialogLabels().openTitle,
      defaultDirectory: this.dependencies.defaultDirectory,
    });
    if (filePaths === undefined || filePaths.length === 0) {
      return attachmentSucceeded({ status: "cancelled" });
    }
    return this.importPaths(entryId, filePaths);
  }

  /**
   * 把给定路径的文件添加为条目的附件.
   * @param entryId 条目编号.
   * @param filePaths 文件的绝对路径, 按添加顺序排列.
   * @returns 已添加的附件元数据; 没有路径, 有文件不合规, 超过个数或总大小上限, 读取失败, 没有这个
   * 条目, 保险库未解锁或数据库出错时为失败结果.
   */
  async importPaths(
    entryId: string,
    filePaths: readonly string[],
  ): Promise<AttachmentResult<AttachmentAddOutcome>> {
    const { service, reader } = this.dependencies;
    if (filePaths.length === 0) {
      return attachmentFailed("invalid-input");
    }
    const inspected = await reader.inspect(filePaths);
    if (!inspected.ok) {
      return inspected;
    }
    const capacity = service.checkCapacity(entryId, inspected.value);
    if (!capacity.ok) {
      return capacity;
    }
    const files = await reader.readAll(inspected.value);
    if (!files.ok) {
      return files;
    }
    const inserted = service.insertAll(entryId, files.value);
    return inserted.ok
      ? attachmentSucceeded({ status: "added", attachments: inserted.value })
      : inserted;
  }
}
