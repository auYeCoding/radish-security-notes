import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { BatchService } from "../batch/batch-service";
import {
  requireIdentifier,
  requireIdentifierList,
  requireOptionalIdentifier,
} from "./batch-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册批量相关的 IPC 通道, 参数在进程边界处校验类型后才交给批量服务. 编号列表是否为空, 条目,
 * 文件夹与标签是否存在由服务判定.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 批量服务.
 */
export function registerBatchIpc(
  ipcMain: IpcMainPort,
  service: BatchService,
): void {
  ipcMain.handle(IPC_CHANNELS.batchRemoveEntries, (_event, entryIds) =>
    service.removeEntries(requireIdentifierList(entryIds)),
  );
  ipcMain.handle(IPC_CHANNELS.batchMoveEntries, (_event, entryIds, folderId) =>
    service.moveEntries(
      requireIdentifierList(entryIds),
      requireOptionalIdentifier(folderId),
    ),
  );
  ipcMain.handle(IPC_CHANNELS.batchAddTag, (_event, entryIds, tagId) =>
    service.addTag(requireIdentifierList(entryIds), requireIdentifier(tagId)),
  );
  ipcMain.handle(IPC_CHANNELS.batchRemoveTag, (_event, entryIds, tagId) =>
    service.removeTag(
      requireIdentifierList(entryIds),
      requireIdentifier(tagId),
    ),
  );
}
