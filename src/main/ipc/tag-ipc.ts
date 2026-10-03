import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { TagService } from "../tags/tag-service";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 标签参数不合规时的错误信息.
 */
const INVALID_TAG_ARGUMENT_MESSAGE = "无效的标签参数";

/**
 * 校验渲染进程传来的标签编号, 名称或颜色键是字符串.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的字符串.
 * @throws Error 当参数不是字符串时.
 */
function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(INVALID_TAG_ARGUMENT_MESSAGE);
  }
  return value;
}

/**
 * 注册标签相关的 IPC 通道, 参数在进程边界处校验类型后才交给标签服务. 名称是否合规, 颜色是否
 * 在调色板里与是否重名由服务判定.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 标签服务.
 */
export function registerTagIpc(
  ipcMain: IpcMainPort,
  service: TagService,
): void {
  ipcMain.handle(IPC_CHANNELS.tagsList, () => service.list());
  ipcMain.handle(IPC_CHANNELS.tagsCreate, (_event, name, color) =>
    service.create(requireString(name), requireString(color)),
  );
  ipcMain.handle(IPC_CHANNELS.tagsUpdate, (_event, id, name, color) =>
    service.update(
      requireString(id),
      requireString(name),
      requireString(color),
    ),
  );
  ipcMain.handle(IPC_CHANNELS.tagsRemove, (_event, id) =>
    service.remove(requireString(id)),
  );
}
