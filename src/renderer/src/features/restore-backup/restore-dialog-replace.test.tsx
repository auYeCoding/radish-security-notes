import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";
import { restoreSucceeded } from "@shared/restore/restore-result";

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
 * 清空确认的名称.
 */
const ACKNOWLEDGE_NAME = "我明白这些数据将被永久删除";

/**
 * 渲染恢复入口, 选择一个保险库里已有内容的备份并等预览出现.
 * @param overrides 覆盖假恢复桥上的方法.
 * @returns 条目环境.
 */
function openFilledVaultPreview(
  overrides: Partial<RestoreBridge> = {},
): Promise<EntryTestEnvironment> {
  return openRestorePreviewWith(() => <RestoreTrigger />, {
    restoreBridgeOverrides: {
      chooseFile: readyRestoreWith({ vault: FAKE_FILLED_RESTORE_VAULT }),
      ...overrides,
    },
  });
}

describe("恢复对话框: 保险库里已有内容", () => {
  it("显示清空警示与现有内容的个数, 没有空保险库的说明", async () => {
    await openFilledVaultPreview();

    expect(screen.getByText("将清空当前保险库")).toBeDefined();
    expect(
      screen.getByText(
        /当前保险库里有 12 条条目, 4 个附件, 3 个文件夹, 5 个标签, 2 个自定义类型\. 恢复会先永久删除这些数据/,
      ),
    ).toBeDefined();
    expect(
      screen.queryByText("当前保险库是空的, 备份里的内容会按原样写入."),
    ).toBeNull();
  });

  it("确认按钮写清空并恢复, 勾选清空确认之前不可点, 勾选后可点, 取消勾选又不可点", async () => {
    await openFilledVaultPreview();
    const user = userEvent.setup();

    expect(screen.queryByRole("button", { name: "开始恢复" })).toBeNull();
    expect(isButtonDisabled("清空并恢复")).toBe(true);

    await user.click(screen.getByRole("checkbox", { name: ACKNOWLEDGE_NAME }));
    expect(isButtonDisabled("清空并恢复")).toBe(false);

    await user.click(screen.getByRole("checkbox", { name: ACKNOWLEDGE_NAME }));
    expect(isButtonDisabled("清空并恢复")).toBe(true);
  });

  it("请求带上清空确认 true, 结果页说明已清空并替换原有数据", async () => {
    const run = vi.fn<RestoreBridge["run"]>(() =>
      Promise.resolve(
        restoreSucceeded({
          ...FAKE_RESTORE_OUTCOME,
          replacedExistingData: true,
        }),
      ),
    );
    await openFilledVaultPreview({ run });
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: ACKNOWLEDGE_NAME }));
    await user.click(screen.getByRole("button", { name: "清空并恢复" }));

    expect(await screen.findByText("恢复完成")).toBeDefined();
    expect(run).toHaveBeenCalledWith({ acknowledgesReplace: true });
    expect(
      screen.getByText("已清空原有数据, 并替换为备份里的内容."),
    ).toBeDefined();
  });
});
