import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { exportFailed, exportSucceeded } from "@shared/export/export-result";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { FAKE_EXPORT_SCOPE_SUMMARY } from "@renderer/testing/fake-export-bridge";
import {
  openExportDialogWith,
  startPlaintextExport,
} from "@renderer/testing/open-export-dialog";

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

/**
 * 点第一步的 "下一步" 进入确认步骤.
 * @returns 进入完成后兑现.
 */
async function goToConfirm(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: "下一步" }));
  await screen.findByText("确认导出");
}

/**
 * 确认步骤的 "导出..." 按钮是否不可点.
 * @returns 不可点时为 true.
 */
function isExportDisabled(): boolean {
  return screen
    .getByRole("button", { name: "导出..." })
    .hasAttribute("disabled");
}

describe("导出对话框: 确认步骤", () => {
  it("列出各项选择与明文风险, 勾选风险并输入主密码后才能导出", async () => {
    await openExportDialog();
    await goToConfirm();
    const user = userEvent.setup();

    expect(screen.getByText("本应用完整格式 (ZIP)")).toBeDefined();
    expect(screen.getByText("不加密 (明文)")).toBeDefined();
    expect(screen.getByText("导出文件是明文")).toBeDefined();
    expect(isExportDisabled()).toBe(true);

    await user.click(
      screen.getByRole("checkbox", {
        name: "我了解导出文件是明文, 含全部密码",
      }),
    );
    expect(isExportDisabled()).toBe(true);

    await user.type(screen.getByLabelText("主密码"), "main-password");
    expect(isExportDisabled()).toBe(false);
  });

  it("没有设主密码时不要求输入主密码", async () => {
    await openExportDialog({
      exportBridgeOverrides: {
        describeScope: () =>
          Promise.resolve(
            exportSucceeded({
              ...FAKE_EXPORT_SCOPE_SUMMARY,
              hasMasterPassword: false,
            }),
          ),
      },
    });
    await goToConfirm();

    expect(screen.queryByLabelText("主密码")).toBeNull();
    await userEvent.setup().click(
      screen.getByRole("checkbox", {
        name: "我了解导出文件是明文, 含全部密码",
      }),
    );
    expect(isExportDisabled()).toBe(false);
  });

  it("返回修改回到第一步, 之前的选择还在", async () => {
    await openExportDialog();
    const user = userEvent.setup();
    await user.click(screen.getByText("浏览器密码 (CSV)"));
    await goToConfirm();

    await user.click(screen.getByRole("button", { name: "返回修改" }));

    const csv = await screen.findByRole("radio", { name: /浏览器密码/ });
    expect(csv.getAttribute("aria-checked")).toBe("true");
  });
});

describe("导出对话框: 提交导出请求", () => {
  it("请求带格式, 范围, 选项, 风险确认与主密码, 不加密时不带口令", async () => {
    const environment = await openExportDialog();

    await startPlaintextExport();

    const run = vi.mocked(environment.exportBridge.run);
    expect(run).toHaveBeenCalledTimes(1);
    const request = run.mock.calls[0][0];
    expect(request).toEqual({
      format: "native",
      scope: { kind: "all" },
      includeSecrets: true,
      includeAttachments: true,
      hasAcknowledgedPlaintextRisk: true,
      masterPassword: "main-password",
    });
    expect(request).not.toHaveProperty("passphrase");
  });

  it("主密码错误时留在确认步骤, 提示原因, 已输入的主密码还在", async () => {
    await openExportDialog({
      exportBridgeOverrides: {
        run: () => Promise.resolve(exportFailed("wrong-master-password")),
      },
    });

    await startPlaintextExport();

    expect(await screen.findByText("主密码不正确, 请重新输入.")).toBeDefined();
    const field = screen.getByLabelText("主密码");
    expect(field).toHaveProperty("value", "main-password");
  });

  it("在保存对话框里取消后回到确认步骤, 没有失败提示", async () => {
    await openExportDialog({
      exportBridgeOverrides: {
        run: () =>
          Promise.resolve(exportSucceeded({ status: "cancelled" as const })),
      },
    });

    await startPlaintextExport();

    expect(await screen.findByText("确认导出")).toBeDefined();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toContain("导出文件是明文");
    expect(isExportDisabled()).toBe(false);
  });
});
