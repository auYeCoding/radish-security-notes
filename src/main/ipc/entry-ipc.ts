import {
  isEntryCopyField,
  type EntryCopyField,
  type NewEntryInput,
} from "@shared/entries/entry-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { EntryService } from "../entries/entry-service";
import type { IpcMainPort } from "./preferences-ipc";

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
 * 校验渲染进程传来的复制字段是可复制的字段名.
 * @param field 渲染进程传来的值.
 * @returns 校验通过的字段名.
 * @throws Error 当参数不是可复制字段名时.
 */
function requireCopyField(field: unknown): EntryCopyField {
  if (!isEntryCopyField(field)) {
    throw new Error("无效的复制字段");
  }
  return field;
}

/**
 * 校验渲染进程传来的新建输入是三个字符串字段组成的对象. 名称是否为空, 是否超长由服务判定,
 * 这里只保证类型.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的新建输入.
 * @throws Error 当参数不是三个字符串字段组成的对象时.
 */
function requireNewEntryInput(input: unknown): NewEntryInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("无效的条目内容");
  }
  const name: unknown = Reflect.get(input, "name");
  const account: unknown = Reflect.get(input, "account");
  const password: unknown = Reflect.get(input, "password");
  if (
    typeof name !== "string" ||
    typeof account !== "string" ||
    typeof password !== "string"
  ) {
    throw new Error("无效的条目内容");
  }
  return { name, account, password };
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
  ipcMain.handle(IPC_CHANNELS.entriesCopyField, (_event, id, field) =>
    service.copyField(requireEntryIdentifier(id), requireCopyField(field)),
  );
}
