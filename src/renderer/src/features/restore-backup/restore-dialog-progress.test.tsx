import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";
import {
  restoreSucceeded,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type {
  RestoreChooseOutcome,
  RestoreOutcome,
  RestoreProgressSnapshot,
  RestoreReadyOutcome,
} from "@shared/restore/restore-types";

import {
  FAKE_RESTORE_OUTCOME,
  FAKE_RESTORE_PREVIEW,
  needsPassphraseWith,
} from "@renderer/testing/fake-restore-bridge";
import {
  chooseBackupFile,
  openRestoreDialogWith,
  openRestorePreviewWith,
} from "@renderer/testing/open-restore-dialog";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 一个由测试决定何时兑现的处理结果.
 */
interface PendingWork<Value> {
  /**
   * 兑现处理的结果.
   */
  readonly resolve: (value: Value) => void;
  /**
   * 处理的承诺.
   */
  readonly promise: Promise<Value>;
}

/**
 * 创建一个等测试来兑现的处理结果.
 * @returns 承诺与兑现函数.
 */
function createPendingWork<Value>(): PendingWork<Value> {
  let resolve: PendingWork<Value>["resolve"] = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

/**
 * 创建总是返回同一个进度快照的轮询函数.
 * @param snapshot 进度快照.
 * @returns 读取进度的间谍.
 */
function progressOf(
  snapshot: RestoreProgressSnapshot,
): RestoreBridge["getProgress"] {
  return vi.fn(() => Promise.resolve(snapshot));
}

describe("恢复对话框: 选择文件处理中的进度", () => {
  it("轮询主进程的进度, 显示阶段与已处理个数, 处理中不能直接关闭", async () => {
    const pending = createPendingWork<RestoreResult<RestoreChooseOutcome>>();
    const environment = await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        chooseFile: () => pending.promise,
        getProgress: progressOf({
          stage: "unpacking",
          processed: 50,
          total: 200,
        }),
      },
    });
    await chooseBackupFile();

    expect(await screen.findByText("正在解包...")).toBeDefined();
    expect(await screen.findByText("50 / 200")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "25",
    );
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    expect(screen.queryByRole("button", { name: /取消/ })).toBeNull();

    await userEvent.setup().keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(environment.restoreBridge.cancel).not.toHaveBeenCalled();
    pending.resolve(restoreSucceeded({ status: "cancelled" as const }));
    expect(
      await screen.findByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
  });
});

describe("恢复对话框: 解密处理中的进度", () => {
  it("提交口令后显示解密阶段, 阶段没有细分进度时不显示个数", async () => {
    const pending = createPendingWork<RestoreResult<RestoreReadyOutcome>>();
    await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        chooseFile: needsPassphraseWith(2048),
        submitPassphrase: () => pending.promise,
        getProgress: progressOf({
          stage: "decrypting",
          processed: 0,
          total: 0,
        }),
      },
    });
    await chooseBackupFile();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("备份口令"), "passphrase");
    await user.click(screen.getByRole("button", { name: "解密并预览" }));

    expect(await screen.findByText("正在解密, 可能需要几秒...")).toBeDefined();
    expect(screen.queryByText("0 / 0")).toBeNull();
    expect(
      screen.getByRole("progressbar").getAttribute("aria-valuenow"),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    pending.resolve(
      restoreSucceeded({
        status: "ready" as const,
        preview: FAKE_RESTORE_PREVIEW,
      }),
    );
    expect(await screen.findByText("确认恢复内容")).toBeDefined();
  });
});

describe("恢复对话框: 写库处理中的进度", () => {
  it("确认恢复后显示写入阶段, 处理中不能关闭, 完成后可以", async () => {
    const pending = createPendingWork<RestoreResult<RestoreOutcome>>();
    const environment = await openRestorePreviewWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        run: () => pending.promise,
        getProgress: progressOf({
          stage: "writing",
          processed: 4,
          total: 8,
        }),
      },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始恢复" }));

    expect(await screen.findByText("正在写入保险库...")).toBeDefined();
    expect(await screen.findByText("4 / 8")).toBeDefined();
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(environment.restoreBridge.cancel).not.toHaveBeenCalled();

    pending.resolve(restoreSucceeded(FAKE_RESTORE_OUTCOME));
    expect(await screen.findByText("恢复完成")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
  });
});

describe("恢复对话框: 关闭", () => {
  it("在预览步骤点关闭按钮关闭对话框并让主进程放弃读出的备份", async () => {
    const environment = await openRestorePreviewWith(() => <RestoreTrigger />);

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
  });

  it("按 Esc 也能关闭对话框并让主进程放弃读出的备份", async () => {
    const environment = await openRestorePreviewWith(() => <RestoreTrigger />);

    await userEvent.setup().keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
  });
});
