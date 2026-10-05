import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { importSucceeded } from "@shared/import/import-result";
import type { NotImportedItem } from "@shared/import/import-reasons";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { FAKE_IMPORT_OUTCOME } from "@renderer/testing/fake-import-bridge";
import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { ImportTrigger } from "./import-trigger";

/**
 * 渲染导入入口, 走完选择文件与确认导入, 等结果页出现.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
async function openResult(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    () => <ImportTrigger />,
    options,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "导入数据" }));
  await user.click(await screen.findByRole("button", { name: "选择文件..." }));
  await user.click(await screen.findByRole("button", { name: "确认导入" }));
  await screen.findByText("导入完成");
  return environment;
}

describe("导入对话框: 确认导入", () => {
  it("默认按跳过重复条目导入, 并刷新条目, 文件夹与标签", async () => {
    const environment = await openResult();

    expect(environment.importBridge.run).toHaveBeenCalledWith({
      duplicatePolicy: "skip",
    });
    await waitFor(() =>
      expect(environment.entryBridge.list).toHaveBeenCalled(),
    );
    expect(environment.folderBridge.list).toHaveBeenCalled();
    expect(environment.tagBridge.list).toHaveBeenCalled();
  });

  it("选了仍然导入时把这个选项交给主进程", async () => {
    const { environment } = await renderInEntryEnvironment(() => (
      <ImportTrigger />
    ));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "导入数据" }));
    await user.click(
      await screen.findByRole("button", { name: "选择文件..." }),
    );
    await user.click(await screen.findByText("仍然导入"));
    await user.click(screen.getByRole("button", { name: "确认导入" }));
    await screen.findByText("导入完成");

    expect(environment.importBridge.run).toHaveBeenCalledWith({
      duplicatePolicy: "import",
    });
  });
});

describe("导入对话框: 结果与清单", () => {
  it("显示导入概况, 删除导出文件的提示与未能带入的内容", async () => {
    await openResult();

    const rows = screen
      .getAllByRole("definition")
      .map((row) => row.textContent);
    expect(rows).toEqual(["3", "0", "1", "1", "0"]);
    expect(screen.getByText("请删除导出文件")).toBeDefined();
    expect(screen.getByText("未能带入的内容 (2)")).toBeDefined();
    expect(screen.getByText("条目 护照")).toBeDefined();
    expect(
      screen.getByText("本应用没有对应的条目类型, 整条没有导入"),
    ).toBeDefined();
    expect(
      screen.getByText("字段 TOTP: TOTP 无法解析, 已丢弃, 其余内容照常导入"),
    ).toBeDefined();
  });

  it("保存为文本文件与打开所在文件夹交给主进程, 保存后提示已保存", async () => {
    const environment = await openResult();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "打开所在文件夹" }));
    await user.click(screen.getByRole("button", { name: "保存为文本文件" }));

    expect(environment.importBridge.revealFile).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("清单已保存.")).toBeDefined();
  });

  it("点完成关闭对话框并让主进程释放保留的信息", async () => {
    const environment = await openResult();

    await userEvent.setup().click(screen.getByRole("button", { name: "完成" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.importBridge.cancel).toHaveBeenCalledTimes(1);
  });
});

describe("导入对话框: 没有未能带入的内容与清单很长", () => {
  it("没有未能带入的内容时只说明这一点, 没有保存按钮", async () => {
    await openResult({
      importBridgeOverrides: {
        run: () =>
          Promise.resolve(
            importSucceeded({ ...FAKE_IMPORT_OUTCOME, notImported: [] }),
          ),
      },
    });

    expect(screen.getByText("没有未能带入的内容.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "保存为文本文件" })).toBeNull();
  });

  it("清单超过显示上限时只显示前 500 项并说明", async () => {
    const items: NotImportedItem[] = Array.from(
      { length: 600 },
      (_v, index) => ({
        scope: "entry",
        name: `条目${index}`,
        reason: "favorite-unsupported",
      }),
    );
    await openResult({
      importBridgeOverrides: {
        run: () =>
          Promise.resolve(
            importSucceeded({ ...FAKE_IMPORT_OUTCOME, notImported: items }),
          ),
      },
    });

    expect(screen.getByText("未能带入的内容 (600)")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(500);
    expect(
      screen.getByText("只显示前 500 项, 完整清单请保存为文本文件."),
    ).toBeDefined();
  });
});
