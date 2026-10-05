import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { exportSucceeded } from "@shared/export/export-result";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { FAKE_EXPORT_SCOPE_SUMMARY } from "@renderer/testing/fake-export-bridge";
import { openExportDialogWith } from "@renderer/testing/open-export-dialog";

import { ExportTrigger } from "./export-trigger";

/**
 * 渲染导出入口并点开对话框.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
function openExportDialog(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  return openExportDialogWith(() => <ExportTrigger />, options);
}

describe("导出对话框: 选择格式", () => {
  it("入口打开对话框, 列出三种格式, 默认选中本应用完整格式", async () => {
    await openExportDialog();

    const group = screen.getByRole("radiogroup", { name: "导出格式" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Bitwarden (JSON)")).toBeDefined();
    expect(screen.getByText("浏览器密码 (CSV)")).toBeDefined();
  });

  it("选中 Bitwarden 后列出它带不出的内容, 附件勾选不可改并写明原因", async () => {
    await openExportDialog();

    await userEvent.setup().click(screen.getByText("Bitwarden (JSON)"));

    expect(screen.getByText("这种格式带不出:")).toBeDefined();
    expect(screen.getByText("标签")).toBeDefined();
    expect(screen.getByText("这种格式不能带附件.")).toBeDefined();
    const attachments = screen.getByRole("checkbox", { name: "包含附件" });
    expect(attachments.getAttribute("aria-checked")).toBe("false");
    expect(attachments.getAttribute("aria-disabled")).toBe("true");
  });

  it("选中浏览器密码 CSV 后提醒表格软件的公式风险", async () => {
    await openExportDialog();

    await userEvent.setup().click(screen.getByText("浏览器密码 (CSV)"));

    expect(screen.getByText(/可能被当作公式执行/)).toBeDefined();
  });
});

describe("导出对话框: 导出内容", () => {
  it("保密字段与附件默认包含, 本应用格式下都能取消勾选", async () => {
    await openExportDialog();
    const user = userEvent.setup();
    const secrets = screen.getByRole("checkbox", {
      name: "包含保密字段与 TOTP 密钥",
    });
    const attachments = screen.getByRole("checkbox", { name: "包含附件" });
    expect(secrets.getAttribute("aria-checked")).toBe("true");
    expect(attachments.getAttribute("aria-checked")).toBe("true");

    await user.click(secrets);
    await user.click(attachments);

    expect(secrets.getAttribute("aria-checked")).toBe("false");
    expect(attachments.getAttribute("aria-checked")).toBe("false");
  });
});

describe("导出对话框: 选择范围", () => {
  it("三种范围各写明条目个数, 没有条目的范围不可选, 默认选中全部条目", async () => {
    await openExportDialog();

    const group = screen.getByRole("radiogroup", { name: "导出范围" });
    const [all, current, checked] = within(group).getAllByRole("radio");
    expect(all.getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByText("3 条")).toBeDefined();
    expect(current.getAttribute("aria-disabled")).not.toBe("true");
    expect(checked.getAttribute("aria-disabled")).toBe("true");
  });

  it("统计出的条目与附件显示在范围下面", async () => {
    await openExportDialog();

    expect(screen.getByText(/将导出 8 条条目/)).toBeDefined();
    expect(screen.getByText(/其中附件 3 个/)).toBeDefined();
  });

  it("选当前列表把列表里的条目编号交给主进程统计", async () => {
    const environment = await openExportDialog();

    await userEvent.setup().click(screen.getByText("当前列表"));

    expect(environment.exportBridge.describeScope).toHaveBeenLastCalledWith({
      kind: "entries",
      entryIds: ["forum", "wiki", "bank"],
    });
  });

  it("勾选条目后可选已勾选的条目, 把勾选的编号交给主进程统计", async () => {
    const environment = await openExportDialog();
    act(() => environment.batchSelectionStore.getState().toggle("bank"));

    await userEvent.setup().click(screen.getByText("已勾选的条目"));

    expect(environment.exportBridge.describeScope).toHaveBeenLastCalledWith({
      kind: "entries",
      entryIds: ["bank"],
    });
  });

  it("统计出来的条目数是 0 时提示范围为空", async () => {
    await openExportDialog({
      exportBridgeOverrides: {
        describeScope: () =>
          Promise.resolve(
            exportSucceeded({ ...FAKE_EXPORT_SCOPE_SUMMARY, entryCount: 0 }),
          ),
      },
    });

    expect(screen.getByText("这个范围里没有条目.")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "下一步" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
