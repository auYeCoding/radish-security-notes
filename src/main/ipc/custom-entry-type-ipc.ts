import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { CustomEntryTypeService } from "../entry-types/custom-entry-type-service";
import {
  requireRemoveCustomEntryTypeInput,
  requireUpdateCustomEntryTypeInput,
} from "./custom-entry-type-edit-input-guard";
import { requireNewCustomEntryTypeInput } from "./custom-entry-type-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册自定义条目类型相关的 IPC 通道, 新建, 修改与删除的参数在进程边界处校验类型后才交给自定义类型
 * 服务. 内容是否合规, 是否重名, 是否超过个数上限与是否需要确认由服务判定.
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
  ipcMain.handle(IPC_CHANNELS.entryTypesUpdate, (_event, input) =>
    service.update(requireUpdateCustomEntryTypeInput(input)),
  );
  ipcMain.handle(IPC_CHANNELS.entryTypesRemove, (_event, input) =>
    service.remove(requireRemoveCustomEntryTypeInput(input)),
  );
}
