import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";
import {
  attachmentFailed,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";
import type {
  AttachmentAddOutcome,
  AttachmentMeta,
  AttachmentSaveOutcome,
} from "@shared/attachments/attachment-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建附件桥需要的依赖.
 */
export interface AttachmentBridgeDependencies {
  /**
   * 渲染进程 IPC 接口.
   */
  readonly ipcRenderer: IpcRendererPort;
  /**
   * 取拖入文件的磁盘路径, 对应 Electron 的 `webUtils.getPathForFile`; 文件不是来自磁盘时返回空串.
   */
  readonly getPathForFile: (file: File) => string;
}

/**
 * 调用一个附件通道, 把主进程返回的值当作附件操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的附件操作结果.
 */
async function invokeAttachment<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<AttachmentResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as AttachmentResult<Value>;
}

/**
 * 把拖入的文件添加为条目的附件: 文件在这里换成磁盘路径, 只有路径经 IPC 交给主进程, 文件内容不经
 * 渲染端; 没有文件, 或有文件不是来自磁盘 (路径为空) 时整次拒绝, 不调用主进程.
 * @param dependencies 桥的依赖.
 * @param entryId 条目编号.
 * @param files 拖入的文件.
 * @returns 主进程的添加结果, 或无效输入的失败结果.
 */
function addDroppedFiles(
  dependencies: AttachmentBridgeDependencies,
  entryId: string,
  files: readonly File[],
): Promise<AttachmentResult<AttachmentAddOutcome>> {
  const filePaths = files.map(dependencies.getPathForFile);
  if (filePaths.length === 0 || filePaths.includes("")) {
    return Promise.resolve(attachmentFailed("invalid-input"));
  }
  return invokeAttachment<AttachmentAddOutcome>(
    dependencies.ipcRenderer,
    IPC_CHANNELS.attachmentsAddPaths,
    entryId,
    filePaths,
  );
}

/**
 * 创建附件桥, 把每个方法映射到对应的 IPC 通道.
 * @param dependencies 桥的依赖.
 * @returns 附件桥.
 */
export function createAttachmentBridge(
  dependencies: AttachmentBridgeDependencies,
): AttachmentBridge {
  const { ipcRenderer } = dependencies;
  return {
    list: (entryId) =>
      invokeAttachment<readonly AttachmentMeta[]>(
        ipcRenderer,
        IPC_CHANNELS.attachmentsList,
        entryId,
      ),
    addFromDialog: (entryId) =>
      invokeAttachment<AttachmentAddOutcome>(
        ipcRenderer,
        IPC_CHANNELS.attachmentsAddFromDialog,
        entryId,
      ),
    addDropped: (entryId, files) =>
      addDroppedFiles(dependencies, entryId, files),
    saveAs: (attachmentId) =>
      invokeAttachment<AttachmentSaveOutcome>(
        ipcRenderer,
        IPC_CHANNELS.attachmentsSaveAs,
        attachmentId,
      ),
    open: (attachmentId) =>
      invokeAttachment<undefined>(
        ipcRenderer,
        IPC_CHANNELS.attachmentsOpen,
        attachmentId,
      ),
    preview: (attachmentId) =>
      invokeAttachment<string>(
        ipcRenderer,
        IPC_CHANNELS.attachmentsPreview,
        attachmentId,
      ),
    remove: (attachmentId) =>
      invokeAttachment<undefined>(
        ipcRenderer,
        IPC_CHANNELS.attachmentsRemove,
        attachmentId,
      ),
  };
}
