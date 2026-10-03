import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { FolderService } from "../folders/folder-service";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 文件夹参数不合规时的错误信息.
 */
const INVALID_FOLDER_ARGUMENT_MESSAGE = "无效的文件夹参数";

/**
 * 校验渲染进程传来的文件夹或条目编号, 文件夹名称是字符串.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的字符串.
 * @throws Error 当参数不是字符串时.
 */
function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(INVALID_FOLDER_ARGUMENT_MESSAGE);
  }
  return value;
}

/**
 * 校验渲染进程传来的文件夹编号可省略, 给出时是字符串.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的文件夹编号, 省略时为 undefined.
 * @throws Error 当参数存在却不是字符串时.
 */
function requireOptionalString(value: unknown): string | undefined {
  return value === undefined ? undefined : requireString(value);
}

/**
 * 注册文件夹相关的 IPC 通道, 参数在进程边界处校验类型后才交给文件夹服务. 名称是否合规与是否
 * 重名由服务判定.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 文件夹服务.
 */
export function registerFolderIpc(
  ipcMain: IpcMainPort,
  service: FolderService,
): void {
  ipcMain.handle(IPC_CHANNELS.foldersList, () => service.list());
  ipcMain.handle(IPC_CHANNELS.foldersCreate, (_event, name) =>
    service.create(requireString(name)),
  );
  ipcMain.handle(IPC_CHANNELS.foldersRename, (_event, id, name) =>
    service.rename(requireString(id), requireString(name)),
  );
  ipcMain.handle(IPC_CHANNELS.foldersRemove, (_event, id) =>
    service.remove(requireString(id)),
  );
  ipcMain.handle(IPC_CHANNELS.foldersAssignEntry, (_event, entryId, folderId) =>
    service.assignEntry(
      requireString(entryId),
      requireOptionalString(folderId),
    ),
  );
}
