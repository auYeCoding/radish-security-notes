import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { importSucceeded } from "@shared/import/import-result";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { failingImportWith } from "@renderer/testing/fake-import-bridge";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { ImportTrigger } from "./import-trigger";

/**
 * 渲染导入入口, 点开对话框并点 "选择文件".
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
async function chooseFile(
  options: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    () => <ImportTrigger />,
    options,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "导入数据" }));
  await user.click(await screen.findByRole("button", { name: "选择文件..." }));
  return environment;
}

describe("导入对话框: 选择文件失败", () => {
  it("文件超限时回到选择来源并提示上限", async () => {
    await chooseFile({
      importBridgeOverrides: {
        chooseFile: failingImportWith("file-too-large"),
      },
    });

    const alert = await screen.findByText("文件超过 20 MiB, 无法导入.");
    expect(alert).toBeDefined();
    expect(screen.getByText("选择来源与文件格式")).toBeDefined();
  });

  it("文件格式错误带行号时提示行号", async () => {
    await chooseFile({
      importBridgeOverrides: {
        chooseFile: failingImportWith("malformed-file", 12),
      },
    });

    expect(
      await screen.findByText("文件格式有误, 无法解析 (第 12 行附近)."),
    ).toBeDefined();
  });

  it("组织库, 加密, 编码问题各有对应提示", async () => {
    await chooseFile({
      importBridgeOverrides: {
        chooseFile: failingImportWith("organization-export-unsupported"),
      },
    });

    expect(
      await screen.findByText("这是组织库的导出, 暂不支持, 请改用个人库导出."),
    ).toBeDefined();
  });

  it("用户取消系统对话框时回到选择来源, 没有提示", async () => {
    await chooseFile({
      importBridgeOverrides: {
        chooseFile: () =>
          Promise.resolve(importSucceeded({ status: "cancelled" as const })),
      },
    });

    expect(await screen.findByText("选择来源与文件格式")).toBeDefined();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});

describe("导入对话框: 确认导入失败", () => {
  it("写库失败时回到选择来源并提示没有任何改动", async () => {
    const environment = await chooseFile({
      importBridgeOverrides: { run: failingImportWith("unexpected-error") },
    });

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "确认导入" }));

    expect(
      await screen.findByText(
        "导入失败, 没有任何改动. 请重试, 仍失败请关闭应用后重试.",
      ),
    ).toBeDefined();
    expect(environment.entryBridge.list).not.toHaveBeenCalled();
  });
});
