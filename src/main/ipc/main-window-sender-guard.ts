import { isRecord } from "./ipc-input-checks";

/**
 * 来源校验失败时抛出的错误信息: 固定文字, 不含通道名, 参数等任何细节.
 */
const SENDER_REJECTION_MESSAGE = "IPC 调用只接受来自主窗口顶层页面的调用";

/**
 * 来源校验依赖的窗口接口, Electron 的 `BrowserWindow` 满足它.
 */
export interface MainWindowSenderTarget {
  /**
   * 窗口里的页面内容, 与调用事件里的发送者比较.
   */
  readonly webContents: unknown;
}

/**
 * 判断一个发送帧是否是顶层帧.
 * @param frame 调用事件里的发送帧.
 * @returns 是顶层帧时为 true.
 */
function isTopLevelFrame(frame: unknown): boolean {
  return isRecord(frame) && frame["parent"] === null;
}

/**
 * 判断调用是否来自主窗口的顶层页面.
 * @param event 主进程收到调用时的事件.
 * @param mainWindow 主窗口.
 * @returns 发送者是主窗口的页面且发送帧是顶层帧时为 true.
 */
function isFromMainWindow(
  event: unknown,
  mainWindow: MainWindowSenderTarget,
): boolean {
  return (
    isRecord(event) &&
    event["sender"] === mainWindow.webContents &&
    isTopLevelFrame(event["senderFrame"])
  );
}

/**
 * 要求一次 IPC 调用来自主窗口的顶层页面: 其它窗口, 子帧, 没有登记主窗口时一律拒绝.
 * @param event 主进程收到调用时的事件.
 * @param mainWindow 当前登记的主窗口.
 * @returns 通过校验的主窗口.
 * @throws Error 当调用不是来自主窗口的顶层页面时.
 */
export function requireMainWindowSender<
  WindowType extends MainWindowSenderTarget,
>(event: unknown, mainWindow: WindowType | undefined): WindowType {
  if (mainWindow === undefined || !isFromMainWindow(event, mainWindow)) {
    throw new Error(SENDER_REJECTION_MESSAGE);
  }
  return mainWindow;
}
