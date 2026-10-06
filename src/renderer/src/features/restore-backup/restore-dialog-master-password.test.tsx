import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";
import {
  restoreFailed,
  restoreSucceeded,
} from "@shared/restore/restore-result";

import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  FAKE_FILLED_RESTORE_VAULT,
  FAKE_RESTORE_OUTCOME,
  readyRestoreWith,
} from "@renderer/testing/fake-restore-bridge";
import { isButtonDisabled } from "@renderer/testing/open-email-backup-dialog";
import { openRestorePreviewWith } from "@renderer/testing/open-restore-dialog";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 渲染恢复入口, 选择一个需要重新输入主密码的备份并等预览出现.
 * @param changes 备份概要里要改动的字段.
 * @param overrides 覆盖假恢复桥上的方法.
 * @returns 条目环境.
 */
function openProtectedPreview(
  changes: Parameters<typeof readyRestoreWith>[0] = {},
  overrides: Partial<RestoreBridge> = {},
): Promise<EntryTestEnvironment> {
  return openRestorePreviewWith(() => <RestoreTrigger />, {
    restoreBridgeOverrides: {
      chooseFile: readyRestoreWith({
        requiresMasterPassword: true,
        ...changes,
      }),
      ...overrides,
    },
  });
}

describe("恢复对话框: 重输主密码", () => {
  it("没设主密码时不显示主密码字段", async () => {
    await openRestorePreviewWith(() => <RestoreTrigger />);

    expect(screen.queryByLabelText("主密码")).toBeNull();
    expect(isButtonDisabled("开始恢复")).toBe(false);
  });

  it("设了主密码时显示字段, 填写前开始恢复不可点, 请求带上主密码", async () => {
    const environment = await openProtectedPreview();
    const user = userEvent.setup();
    expect(isButtonDisabled("开始恢复")).toBe(true);

    await user.type(screen.getByLabelText("主密码"), "my-master");
    expect(isButtonDisabled("开始恢复")).toBe(false);
    await user.click(screen.getByRole("button", { name: "开始恢复" }));

    expect(await screen.findByText("恢复完成")).toBeDefined();
    expect(environment.restoreBridge.run).toHaveBeenCalledWith({
      acknowledgesReplace: false,
      masterPassword: "my-master",
    });
  });
});

describe("恢复对话框: 主密码不对", () => {
  it("在输入框下提示并清空主密码, 备份还在, 重试成功后恢复", async () => {
    const run = vi
      .fn<RestoreBridge["run"]>()
      .mockResolvedValueOnce(restoreFailed("wrong-master-password"))
      .mockResolvedValueOnce(restoreSucceeded(FAKE_RESTORE_OUTCOME));
    const environment = await openProtectedPreview({}, { run });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("主密码"), "wrong");
    await user.click(screen.getByRole("button", { name: "开始恢复" }));

    expect(await screen.findByText("主密码不正确, 请重新输入.")).toBeDefined();
    expect(screen.getByText("确认恢复内容")).toBeDefined();
    expect(screen.getByLabelText("主密码")).toHaveProperty("value", "");
    expect(isButtonDisabled("开始恢复")).toBe(true);
    expect(environment.entryBridge.list).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("主密码"), "right");
    expect(screen.queryByText("主密码不正确, 请重新输入.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "开始恢复" }));

    expect(await screen.findByText("恢复完成")).toBeDefined();
    expect(run.mock.calls.map(([request]) => request)).toEqual([
      { acknowledgesReplace: false, masterPassword: "wrong" },
      { acknowledgesReplace: false, masterPassword: "right" },
    ]);
    expect(environment.restoreBridge.chooseFile).toHaveBeenCalledTimes(1);
  });

  it("清空确认的勾选保留, 不必重新勾选", async () => {
    const run = vi
      .fn<RestoreBridge["run"]>()
      .mockResolvedValueOnce(restoreFailed("wrong-master-password"));
    await openProtectedPreview({ vault: FAKE_FILLED_RESTORE_VAULT }, { run });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("checkbox", { name: "我明白这些数据将被永久删除" }),
    );
    await user.type(screen.getByLabelText("主密码"), "wrong");
    await user.click(screen.getByRole("button", { name: "清空并恢复" }));

    await screen.findByText("主密码不正确, 请重新输入.");
    const checkbox = screen.getByRole("checkbox", {
      name: "我明白这些数据将被永久删除",
    });
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });
});
