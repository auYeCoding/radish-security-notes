import { describe, expect, it } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain } from "../testing/fake-ipc-main";
import {
  SENDER_REJECTION_MESSAGE,
  createFakeMainWindow,
  createSubFrameEvent,
  createTopFrameEvent,
  type FakeMainWindow,
} from "../testing/fake-main-window";
import { createRecordingService } from "../testing/recording-service";
import { createMainWindowHolder } from "../window/main-window-holder";
import { registerEmailBackupIpc } from "./email-backup-ipc";
import { registerEntryIpc } from "./entry-ipc";
import { registerImportIpc } from "./import-ipc";
import type { IpcMainPort } from "./preferences-ipc";
import { registerRecoveryKeyIpc } from "./recovery-key-ipc";
import { registerVaultIpc } from "./vault-ipc";

/**
 * 一个合法来源下能走到服务的调用.
 */
interface PassingCall {
  /**
   * 通道名.
   */
  readonly channel: string;
  /**
   * 传给通道的参数.
   */
  readonly args: readonly unknown[];
  /**
   * 通道应当调用的服务方法名.
   */
  readonly method: string;
}

/**
 * 一类业务模块的 IPC 注册, 以及用来验证来源校验的通道.
 */
interface ModuleCase {
  /**
   * 模块名.
   */
  readonly name: string;
  /**
   * 把模块的通道注册到端口上, 用记录型假服务作后端.
   * @param ipcMain 要注册到的端口.
   * @returns 假服务记下的方法调用.
   */
  readonly register: (ipcMain: IpcMainPort) => string[];
  /**
   * 模块注册的全部通道.
   */
  readonly channels: readonly string[];
  /**
   * 合法来源下能走到服务的调用.
   */
  readonly passingCalls: readonly PassingCall[];
}

/**
 * 一种不合法的调用来源.
 */
interface IllegitimateSource {
  /**
   * 来源的说明.
   */
  readonly name: string;
  /**
   * 按主窗口创建这种来源的调用事件.
   */
  readonly createEvent: (mainWindow: FakeMainWindow) => unknown;
}

/**
 * 故意不合法的参数: 若处理函数先校验参数, 得到的会是参数错误而不是来源拒绝.
 */
const INVALID_ARGUMENTS: readonly unknown[] = [12345, 12345];

/**
 * 要覆盖的不合法来源.
 */
const ILLEGITIMATE_SOURCES: readonly IllegitimateSource[] = [
  {
    name: "其它窗口的页面",
    createEvent: () => createTopFrameEvent(createFakeMainWindow().webContents),
  },
  {
    name: "主窗口的子帧",
    createEvent: (mainWindow) => createSubFrameEvent(mainWindow.webContents),
  },
  { name: "没有来源信息的调用", createEvent: () => ({}) },
];

/**
 * 生成一个注册函数: 用记录型假服务注册一个模块.
 * @param registerModule 模块的注册函数.
 * @returns 注册到端口并返回假服务调用记录的函数.
 */
function registerWithRecording<ServiceType extends object>(
  registerModule: (ipcMain: IpcMainPort, service: ServiceType) => void,
): (ipcMain: IpcMainPort) => string[] {
  return (ipcMain) => {
    const { service, calls } = createRecordingService<ServiceType>();
    registerModule(ipcMain, service);
    return calls;
  };
}

/**
 * 保险库, 条目, 导入, 邮箱备份, 恢复密钥五类模块.
 */
const MODULE_CASES: readonly ModuleCase[] = [
  {
    name: "保险库",
    register: registerWithRecording(registerVaultIpc),
    channels: [
      IPC_CHANNELS.vaultGetStatus,
      IPC_CHANNELS.vaultGetFailure,
      IPC_CHANNELS.vaultSetupWithMasterPassword,
      IPC_CHANNELS.vaultSetupWithoutMasterPassword,
      IPC_CHANNELS.vaultUnlock,
      IPC_CHANNELS.vaultLock,
    ],
    passingCalls: [
      { channel: IPC_CHANNELS.vaultGetStatus, args: [], method: "getStatus" },
      {
        channel: IPC_CHANNELS.vaultGetFailure,
        args: [],
        method: "getFailure",
      },
      { channel: IPC_CHANNELS.vaultLock, args: [], method: "lock" },
      {
        channel: IPC_CHANNELS.vaultUnlock,
        args: ["a long enough password"],
        method: "unlock",
      },
    ],
  },
  {
    name: "条目",
    register: registerWithRecording(registerEntryIpc),
    channels: [
      IPC_CHANNELS.entriesList,
      IPC_CHANNELS.entriesGet,
      IPC_CHANNELS.entriesCreate,
      IPC_CHANNELS.entriesUpdate,
      IPC_CHANNELS.entriesRemove,
      IPC_CHANNELS.entriesCopyField,
      IPC_CHANNELS.entriesCopyCustomField,
      IPC_CHANNELS.entriesSearch,
    ],
    passingCalls: [
      { channel: IPC_CHANNELS.entriesList, args: [], method: "list" },
      {
        channel: IPC_CHANNELS.entriesRemove,
        args: ["entry-1"],
        method: "remove",
      },
    ],
  },
  {
    name: "导入",
    register: registerWithRecording(registerImportIpc),
    channels: [
      IPC_CHANNELS.importChooseFile,
      IPC_CHANNELS.importRun,
      IPC_CHANNELS.importProgress,
      IPC_CHANNELS.importCancel,
      IPC_CHANNELS.importSaveReport,
      IPC_CHANNELS.importRevealFile,
    ],
    passingCalls: [
      { channel: IPC_CHANNELS.importProgress, args: [], method: "getProgress" },
      { channel: IPC_CHANNELS.importCancel, args: [], method: "cancel" },
    ],
  },
  {
    name: "邮箱备份",
    register: registerWithRecording(registerEmailBackupIpc),
    channels: [
      IPC_CHANNELS.emailBackupGetSettings,
      IPC_CHANNELS.emailBackupSaveSettings,
      IPC_CHANNELS.emailBackupSendTest,
      IPC_CHANNELS.emailBackupRunBackup,
      IPC_CHANNELS.emailBackupProgress,
      IPC_CHANNELS.emailBackupGetLastResult,
      IPC_CHANNELS.emailBackupGetAutoBackup,
      IPC_CHANNELS.emailBackupSaveAutoBackup,
    ],
    passingCalls: [
      {
        channel: IPC_CHANNELS.emailBackupGetSettings,
        args: [],
        method: "getSettings",
      },
      {
        channel: IPC_CHANNELS.emailBackupProgress,
        args: [],
        method: "getProgress",
      },
    ],
  },
  {
    name: "恢复密钥",
    register: registerWithRecording(registerRecoveryKeyIpc),
    channels: [IPC_CHANNELS.recoveryViewKey],
    passingCalls: [
      {
        channel: IPC_CHANNELS.recoveryViewKey,
        args: ["a long enough password"],
        method: "viewRecoveryKey",
      },
    ],
  },
];

/**
 * 登记了主窗口, 并把一类模块注册到带来源校验的假 IPC 上的测试环境.
 */
interface ModuleSetup {
  /**
   * 带来源校验的假 IPC.
   */
  readonly ipcMain: ReturnType<typeof createFakeIpcMain>;
  /**
   * 登记在持有者里的假主窗口.
   */
  readonly mainWindow: FakeMainWindow;
  /**
   * 假服务记下的方法调用.
   */
  readonly calls: string[];
}

/**
 * 登记一个主窗口, 注册一类模块.
 * @param moduleCase 要注册的模块.
 * @returns 测试环境.
 */
function setUpModule(moduleCase: ModuleCase): ModuleSetup {
  const mainWindow = createFakeMainWindow();
  const holder = createMainWindowHolder<FakeMainWindow>();
  holder.set(mainWindow);
  const ipcMain = createFakeIpcMain(holder);
  return { ipcMain, mainWindow, calls: moduleCase.register(ipcMain) };
}

describe.each(MODULE_CASES)("$name 模块的通道来源校验", (moduleCase) => {
  it.each(ILLEGITIMATE_SOURCES)(
    "$name 发来的调用被拒绝, 即使参数也不合法, 服务没有被调用",
    ({ createEvent }) => {
      const { ipcMain, mainWindow, calls } = setUpModule(moduleCase);

      for (const channel of moduleCase.channels) {
        expect(() =>
          ipcMain.invokeWithEvent(
            createEvent(mainWindow),
            channel,
            ...INVALID_ARGUMENTS,
          ),
        ).toThrow(SENDER_REJECTION_MESSAGE);
      }
      expect(calls).toEqual([]);
    },
  );

  it.each(moduleCase.passingCalls)(
    "主窗口顶层页面发来的 $channel 调用走到服务的 $method",
    ({ channel, args, method }) => {
      const { ipcMain, calls } = setUpModule(moduleCase);

      ipcMain.invoke(channel, ...args);

      expect(calls).toEqual([method]);
    },
  );
});
