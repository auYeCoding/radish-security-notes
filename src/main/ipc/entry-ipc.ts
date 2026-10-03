import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { EntryService } from "../entries/entry-service";
import { requireNewEntryInput } from "./new-entry-input-guard";
import type { IpcMainPort } from "./preferences-ipc";
import { requireUpdateEntryInput } from "./update-entry-input-guard";

/**
 * 校验渲染进程传来的条目编号是字符串.
 * @param id 渲染进程传来的值.
 * @returns 校验通过的条目编号.
 * @throws Error 当参数不是字符串时.
 */
function requireEntryIdentifier(id: unknown): string {
  if (typeof id !== "string") {
    throw new Error("无效的条目编号");
  }
  return id;
}

/**
 * 校验渲染进程传来的复制字段名是字符串. 字段名是否属于条目的类型由服务判定.
 * @param field 渲染进程传来的值.
 * @returns 校验通过的字段名.
 * @throws Error 当参数不是字符串时.
 */
function requireCopyField(field: unknown): string {
  if (typeof field !== "string") {
    throw new Error("无效的复制字段");
  }
  return field;
}

/**
 * 校验渲染进程传来的自定义字段编号是字符串.
 * @param id 渲染进程传来的值.
 * @returns 校验通过的自定义字段编号.
 * @throws Error 当参数不是字符串时.
 */
function requireCustomFieldIdentifier(id: unknown): string {
  if (typeof id !== "string") {
    throw new Error("无效的字段编号");
  }
  return id;
}

/**
 * 注册条目相关的 IPC 通道, 参数在进程边界处校验类型后才交给条目服务.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 条目服务.
 */
export function registerEntryIpc(
  ipcMain: IpcMainPort,
  service: EntryService,
): void {
  ipcMain.handle(IPC_CHANNELS.entriesList, () => service.list());
  ipcMain.handle(IPC_CHANNELS.entriesGet, (_event, id) =>
    service.get(requireEntryIdentifier(id)),
  );
  ipcMain.handle(IPC_CHANNELS.entriesCreate, (_event, input) =>
    service.create(requireNewEntryInput(input)),
  );
  ipcMain.handle(IPC_CHANNELS.entriesUpdate, (_event, id, input) =>
    service.update(requireEntryIdentifier(id), requireUpdateEntryInput(input)),
  );
  ipcMain.handle(IPC_CHANNELS.entriesRemove, (_event, id) =>
    service.remove(requireEntryIdentifier(id)),
  );
  ipcMain.handle(IPC_CHANNELS.entriesCopyField, (_event, id, field) =>
    service.copyField(requireEntryIdentifier(id), requireCopyField(field)),
  );
  ipcMain.handle(
    IPC_CHANNELS.entriesCopyCustomField,
    (_event, id, customFieldId) =>
      service.copyCustomField(
        requireEntryIdentifier(id),
        requireCustomFieldIdentifier(customFieldId),
      ),
  );
}
