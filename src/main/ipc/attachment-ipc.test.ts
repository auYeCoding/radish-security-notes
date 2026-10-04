import { describe, expect, it, vi } from "vitest";

import { MAX_PATHS_PER_REQUEST } from "@shared/attachments/attachment-limits";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import {
  registerAttachmentIpc,
  type AttachmentIpcHandlers,
} from "./attachment-ipc";

/**
 * 创建带间谍方法的假处理对象.
 * @returns 假处理对象.
 */
function createFakeHandlers(): AttachmentIpcHandlers {
  const succeeded = { ok: true, value: undefined };
  return {
    service: {
      list: vi.fn(() => ({ ok: true, value: [] })),
      remove: vi.fn(() => succeeded),
    },
    importer: {
      importFromDialog: vi.fn(() => Promise.resolve(succeeded)),
      importPaths: vi.fn(() => Promise.resolve(succeeded)),
    },
    exporter: { saveAs: vi.fn(() => Promise.resolve(succeeded)) },
    opener: { open: vi.fn(() => Promise.resolve(succeeded)) },
    previewer: { preview: vi.fn(() => succeeded) },
  } as unknown as AttachmentIpcHandlers;
}

/**
 * 注册了附件 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假处理对象.
   */
  readonly handlers: AttachmentIpcHandlers;
}

/**
 * 注册附件 IPC 并返回假 IPC 与假处理对象.
 * @returns 假 IPC 与假处理对象.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const handlers = createFakeHandlers();
  registerAttachmentIpc(ipcMain, handlers);
  return { ipcMain, handlers };
}

describe("registerAttachmentIpc 转发", () => {
  it("每个通道把参数交给对应的处理对象并返回它的结果", () => {
    const { ipcMain, handlers } = registerWithFakes();

    const listed = ipcMain.invoke(IPC_CHANNELS.attachmentsList, "entry-1");
    ipcMain.invoke(IPC_CHANNELS.attachmentsAddFromDialog, "entry-1");
    ipcMain.invoke(IPC_CHANNELS.attachmentsAddPaths, "entry-1", ["C:\\a.txt"]);
    ipcMain.invoke(IPC_CHANNELS.attachmentsSaveAs, "att-1");
    ipcMain.invoke(IPC_CHANNELS.attachmentsOpen, "att-2");
    ipcMain.invoke(IPC_CHANNELS.attachmentsPreview, "att-3");
    ipcMain.invoke(IPC_CHANNELS.attachmentsRemove, "att-4");

    expect(listed).toEqual({ ok: true, value: [] });
    expect(handlers.service.list).toHaveBeenCalledWith("entry-1");
    expect(handlers.importer.importFromDialog).toHaveBeenCalledWith("entry-1");
    expect(handlers.importer.importPaths).toHaveBeenCalledWith("entry-1", [
      "C:\\a.txt",
    ]);
    expect(handlers.exporter.saveAs).toHaveBeenCalledWith("att-1");
    expect(handlers.opener.open).toHaveBeenCalledWith("att-2");
    expect(handlers.previewer.preview).toHaveBeenCalledWith("att-3");
    expect(handlers.service.remove).toHaveBeenCalledWith("att-4");
  });
});

describe("registerAttachmentIpc 参数校验", () => {
  it("编号不是字符串时抛出错误, 不调用处理对象", () => {
    const { ipcMain, handlers } = registerWithFakes();

    [
      IPC_CHANNELS.attachmentsList,
      IPC_CHANNELS.attachmentsAddFromDialog,
      IPC_CHANNELS.attachmentsSaveAs,
      IPC_CHANNELS.attachmentsOpen,
      IPC_CHANNELS.attachmentsPreview,
      IPC_CHANNELS.attachmentsRemove,
    ].forEach((channel) =>
      expect(() => ipcMain.invoke(channel, 1)).toThrow("无效的附件参数"),
    );

    expect(handlers.service.list).not.toHaveBeenCalled();
    expect(handlers.importer.importFromDialog).not.toHaveBeenCalled();
    expect(handlers.exporter.saveAs).not.toHaveBeenCalled();
    expect(handlers.opener.open).not.toHaveBeenCalled();
    expect(handlers.previewer.preview).not.toHaveBeenCalled();
    expect(handlers.service.remove).not.toHaveBeenCalled();
  });

  it("路径列表不是由非空字符串组成的数组, 或过长时抛出错误, 不调用导入器", () => {
    const { ipcMain, handlers } = registerWithFakes();
    const tooMany = Array.from(
      { length: MAX_PATHS_PER_REQUEST + 1 },
      () => "a",
    );

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.attachmentsAddPaths, "entry-1", "a"),
    ).toThrow("无效的附件参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.attachmentsAddPaths, "entry-1", ["a", 1]),
    ).toThrow("无效的附件参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.attachmentsAddPaths, "entry-1", [""]),
    ).toThrow("无效的附件参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.attachmentsAddPaths, "entry-1", tooMany),
    ).toThrow("无效的附件参数");
    expect(handlers.importer.importPaths).not.toHaveBeenCalled();
  });

  it("空路径列表交给导入器, 由它按无效输入处理", () => {
    const { ipcMain, handlers } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.attachmentsAddPaths, "entry-1", []);

    expect(handlers.importer.importPaths).toHaveBeenCalledWith("entry-1", []);
  });
});
