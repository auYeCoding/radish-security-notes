import { describe, expect, it } from "vitest";

import {
  createFakeMainWindow,
  createTopFrameEvent,
} from "../testing/fake-main-window";
import { requireMainWindowSender } from "./main-window-sender-guard";

/**
 * 校验失败时的错误信息.
 */
const REJECTION_MESSAGE = "窗口控制只接受来自主窗口的调用";

describe("requireMainWindowSender 放行", () => {
  it("发送者是主窗口的页面且发送帧是顶层帧时返回主窗口", () => {
    const mainWindow = createFakeMainWindow();

    const result = requireMainWindowSender(
      createTopFrameEvent(mainWindow.webContents),
      mainWindow,
    );

    expect(result).toBe(mainWindow);
  });
});

describe("requireMainWindowSender 发送者不对", () => {
  it("发送者是其它窗口的页面时被拒绝", () => {
    const mainWindow = createFakeMainWindow();
    const otherWindow = createFakeMainWindow();

    expect(() =>
      requireMainWindowSender(
        createTopFrameEvent(otherWindow.webContents),
        mainWindow,
      ),
    ).toThrow(REJECTION_MESSAGE);
  });

  it("还没有登记主窗口时被拒绝", () => {
    const sender = {};

    expect(() =>
      requireMainWindowSender(createTopFrameEvent(sender), undefined),
    ).toThrow(REJECTION_MESSAGE);
  });

  it("事件不是对象时被拒绝", () => {
    const mainWindow = createFakeMainWindow();

    for (const event of [undefined, null, 1, "event", () => undefined]) {
      expect(() => requireMainWindowSender(event, mainWindow)).toThrow(
        REJECTION_MESSAGE,
      );
    }
  });
});

describe("requireMainWindowSender 发送帧不对", () => {
  it("发送帧是子帧时被拒绝", () => {
    const mainWindow = createFakeMainWindow();
    const subFrameEvent = {
      sender: mainWindow.webContents,
      senderFrame: { parent: {} },
    };

    expect(() => requireMainWindowSender(subFrameEvent, mainWindow)).toThrow(
      REJECTION_MESSAGE,
    );
  });

  it("没有发送帧时被拒绝", () => {
    const mainWindow = createFakeMainWindow();

    for (const senderFrame of [undefined, null]) {
      const event = { sender: mainWindow.webContents, senderFrame };
      expect(() => requireMainWindowSender(event, mainWindow)).toThrow(
        REJECTION_MESSAGE,
      );
    }
  });
});
