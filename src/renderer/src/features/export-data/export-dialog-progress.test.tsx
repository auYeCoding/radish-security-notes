import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  exportSucceeded,
  type ExportResult,
} from "@shared/export/export-result";
import type { ExportRunOutcome } from "@shared/export/export-types";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
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
 * 一个由测试决定何时兑现的导出结果.
 */
interface PendingRun {
  /**
   * 兑现导出的结果.
   */
  readonly resolve: (value: ExportResult<ExportRunOutcome>) => void;
  /**
   * 导出的承诺.
   */
  readonly promise: Promise<ExportResult<ExportRunOutcome>>;
}

/**
 * 创建一个等测试来兑现的导出结果.
 * @returns 承诺与兑现函数.
 */
function createPendingRun(): PendingRun {
  let resolve: PendingRun["resolve"] = () => undefined;
  const promise = new Promise<ExportResult<ExportRunOutcome>>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

describe("导出对话框: 处理中的进度", () => {
  it("轮询主进程的进度, 显示阶段与已处理个数, 处理中不能直接关闭", async () => {
    const pending = createPendingRun();
    await openExportDialog({
      exportBridgeOverrides: {
        run: () => pending.promise,
        getProgress: vi.fn(() =>
          Promise.resolve({
            stage: "writing" as const,
            processed: 50,
            total: 200,
          }),
        ),
      },
    });

    await startPlaintextExport();

    expect(await screen.findByText("正在写出...")).toBeDefined();
    expect(await screen.findByText("50 / 200")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "25",
    );
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    pending.resolve(exportSucceeded({ status: "cancelled" as const }));
  });

  it("点取消让主进程取消, 主进程返回取消后回到确认步骤", async () => {
    const pending = createPendingRun();
    const environment = await openExportDialog({
      exportBridgeOverrides: { run: () => pending.promise },
    });
    await startPlaintextExport();

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "取消" }));
    pending.resolve(exportSucceeded({ status: "cancelled" as const }));

    expect(environment.exportBridge.cancel).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("确认导出")).toBeDefined();
  });
});
