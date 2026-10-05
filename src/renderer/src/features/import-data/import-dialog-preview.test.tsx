import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { importSucceeded } from "@shared/import/import-result";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { FAKE_IMPORT_PREVIEW } from "@renderer/testing/fake-import-bridge";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { ImportTrigger } from "./import-trigger";

/**
 * 渲染导入入口, 点开对话框并选择文件, 等预览出现.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
async function openPreview(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    () => <ImportTrigger />,
    options,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "导入数据" }));
  await user.click(await screen.findByRole("button", { name: "选择文件..." }));
  await screen.findByText("导入预览");
  return environment;
}

describe("导入对话框: 预览", () => {
  it("显示条目总数, 能导入的条目, 整条跳过的条目, 将新建的文件夹, 重复数与将带不进的内容数", async () => {
    await openPreview();

    const rows = screen
      .getAllByRole("definition")
      .map((row) => row.textContent);
    expect(rows).toEqual(["4", "3", "1", "1", "0", "1", "2"]);
    expect(screen.getByText("通用登录 2")).toBeDefined();
    expect(screen.getByText("安全笔记 1")).toBeDefined();
    expect(screen.getByText("导入结束后会给出清单.")).toBeDefined();
  });

  it("预览里没有任何条目内容", async () => {
    await openPreview();

    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).not.toContain("护照");
    expect(text).not.toContain("示例网站");
  });

  it("没有重复条目时不显示重复处理的选择", async () => {
    await openPreview({
      importBridgeOverrides: {
        chooseFile: () =>
          Promise.resolve(
            importSucceeded({
              status: "ready" as const,
              preview: { ...FAKE_IMPORT_PREVIEW, duplicateCount: 0 },
            }),
          ),
      },
    });

    expect(screen.queryByText("重复的条目怎么处理?")).toBeNull();
  });
});

describe("导入对话框: 重复条目的处理", () => {
  it("有重复条目时默认选中跳过, 可以改成仍然导入", async () => {
    await openPreview();
    const user = userEvent.setup();

    const skip = screen.getByRole("radio", { name: /跳过, 不导入/ });
    expect(skip.getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByText("仍然导入"));

    expect(
      screen
        .getByRole("radio", { name: /仍然导入/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("重新选择回到选择来源并让主进程释放解析结果", async () => {
    const environment = await openPreview();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "重新选择" }));

    expect(await screen.findByText("选择来源与文件格式")).toBeDefined();
    expect(environment.importBridge.cancel).toHaveBeenCalledTimes(1);
  });
});
