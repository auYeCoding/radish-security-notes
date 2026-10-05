import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { ImportTrigger } from "./import-trigger";

/**
 * 渲染导入入口并点开对话框.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
async function openDialog(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    () => <ImportTrigger />,
    options,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "导入数据" }));
  await screen.findByRole("dialog");
  return environment;
}

describe("导入对话框: 选择来源", () => {
  it("入口按钮打开对话框, 列出四种来源, 默认选中 Bitwarden JSON", async () => {
    await openDialog();

    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(4);
    const labels = [
      "Bitwarden (JSON)",
      "Bitwarden (CSV)",
      "浏览器密码 (CSV)",
      "KeePassXC (CSV)",
    ];
    labels.forEach((label) => expect(screen.getByText(label)).toBeDefined());
    expect(options[0].getAttribute("aria-checked")).toBe("true");
  });

  it("写明导出文件是明文, 并有选择文件按钮", async () => {
    await openDialog();

    expect(screen.getByText("导出文件是明文")).toBeDefined();
    expect(screen.getByRole("button", { name: "选择文件..." })).toBeDefined();
  });

  it("选中另一种来源后选择文件, 把这个来源交给主进程", async () => {
    const environment = await openDialog();
    const user = userEvent.setup();

    await user.click(screen.getByText("KeePassXC (CSV)"));
    await user.click(screen.getByRole("button", { name: "选择文件..." }));

    await screen.findByText("导入预览");
    expect(environment.importBridge.chooseFile).toHaveBeenCalledWith(
      "keepassxcCsv",
    );
  });
});

describe("导入对话框: 关闭", () => {
  it("在选择来源时关闭对话框会让主进程释放", async () => {
    const environment = await openDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.importBridge.cancel).toHaveBeenCalledTimes(1);
  });
});
