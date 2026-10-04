import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { AttachmentExporter } from "../attachments/attachment-exporter";
import type { AttachmentImporter } from "../attachments/attachment-importer";
import type { AttachmentOpener } from "../attachments/attachment-opener";
import type { AttachmentPreviewer } from "../attachments/attachment-previewer";
import type { AttachmentService } from "../attachments/attachment-service";
import {
  requireAttachmentIdentifier,
  requireFilePaths,
} from "./attachment-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 附件 IPC 转发给的各个处理对象.
 */
export interface AttachmentIpcHandlers {
  /**
   * 附件服务, 处理列出与删除.
   */
  readonly service: AttachmentService;
  /**
   * 导入器, 处理从对话框与拖入的路径添加.
   */
  readonly importer: AttachmentImporter;
  /**
   * 另存为执行器.
   */
  readonly exporter: AttachmentExporter;
  /**
   * 用系统默认程序打开附件的打开器.
   */
  readonly opener: AttachmentOpener;
  /**
   * 图片预览器.
   */
  readonly previewer: AttachmentPreviewer;
}

/**
 * 注册附件相关的 IPC 通道, 参数在进程边界处校验类型与大小后才交给对应的处理对象.
 * @param ipcMain 主进程 IPC 接口.
 * @param handlers 各个处理对象.
 */
export function registerAttachmentIpc(
  ipcMain: IpcMainPort,
  handlers: AttachmentIpcHandlers,
): void {
  const { service, importer, exporter, opener, previewer } = handlers;
  ipcMain.handle(IPC_CHANNELS.attachmentsList, (_event, entryId) =>
    service.list(requireAttachmentIdentifier(entryId)),
  );
  ipcMain.handle(IPC_CHANNELS.attachmentsAddFromDialog, (_event, entryId) =>
    importer.importFromDialog(requireAttachmentIdentifier(entryId)),
  );
  ipcMain.handle(IPC_CHANNELS.attachmentsAddPaths, (_event, entryId, paths) =>
    importer.importPaths(
      requireAttachmentIdentifier(entryId),
      requireFilePaths(paths),
    ),
  );
  ipcMain.handle(IPC_CHANNELS.attachmentsSaveAs, (_event, attachmentId) =>
    exporter.saveAs(requireAttachmentIdentifier(attachmentId)),
  );
  ipcMain.handle(IPC_CHANNELS.attachmentsOpen, (_event, attachmentId) =>
    opener.open(requireAttachmentIdentifier(attachmentId)),
  );
  ipcMain.handle(IPC_CHANNELS.attachmentsPreview, (_event, attachmentId) =>
    previewer.preview(requireAttachmentIdentifier(attachmentId)),
  );
  ipcMain.handle(IPC_CHANNELS.attachmentsRemove, (_event, attachmentId) =>
    service.remove(requireAttachmentIdentifier(attachmentId)),
  );
}
