import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { CustomEntryTypeService } from "../entry-types/custom-entry-type-service";
import { requireNewCustomEntryTypeInput } from "./custom-entry-type-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册自定义条目类型相关的 IPC 通道, 新建的参数在进程边界处校验类型后才交给自定义类型服务.
 * 内容是否合规, 是否重名与是否超过个数上限由服务判定.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 自定义类型服务.
 */
export function registerCustomEntryTypeIpc(
  ipcMain: IpcMainPort,
  service: CustomEntryTypeService,
): void {
  ipcMain.handle(IPC_CHANNELS.entryTypesList, () => service.list());
  ipcMain.handle(IPC_CHANNELS.entryTypesCreate, (_event, input) =>
    service.create(requireNewCustomEntryTypeInput(input)),
  );
}
