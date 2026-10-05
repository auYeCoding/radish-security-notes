import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
  FAKE_EXPORT_SUMMARY,
  failingExportWith,
} from "@renderer/testing/fake-export-bridge";
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
 * 导出成功的结果.
 * @param summary 摘要里要覆盖的部分.
 * @returns 已保存的导出结果.
 */
function savedWith(
  summary: Partial<typeof FAKE_EXPORT_SUMMARY>,
): ExportResult<ExportRunOutcome> {
  return exportSucceeded({
    status: "saved" as const,
    summary: { ...FAKE_EXPORT_SUMMARY, ...summary },
  });
}

describe("导出对话框: 结果页", () => {
  it("明文导出: 显示摘要与保管提醒, 页面上没有文件路径与条目内容", async () => {
    await openExportDialog();

    await startPlaintextExport();

    expect(await screen.findByText("导出完成")).toBeDefined();
    expect(screen.getByText("已导出的条目")).toBeDefined();
    expect(screen.getByText("已导出的附件")).toBeDefined();
    expect(screen.getByText("20 KB")).toBeDefined();
    expect(screen.getByText("请妥善保管并及时删除导出文件")).toBeDefined();
    expect(screen.queryByText(/forum-password/)).toBeNull();
  });

  it("加密导出: 提醒记住口令", async () => {
    await openExportDialog({
      exportBridgeOverrides: {
        run: () => Promise.resolve(savedWith({ isEncrypted: true })),
      },
    });

    await startPlaintextExport();

    expect(await screen.findByText("请记住加密口令")).toBeDefined();
    expect(screen.queryByText("请妥善保管并及时删除导出文件")).toBeNull();
  });

  it("没能带出的内容按原因汇总条数", async () => {
    await openExportDialog({
      exportBridgeOverrides: {
        run: () =>
          Promise.resolve(
            savedWith({
              format: "bitwardenJson",
              includesAttachments: false,
              losses: [{ reason: "tags", count: 3 }],
            }),
          ),
      },
    });

    await startPlaintextExport();

    expect(await screen.findByText("这种格式没能带出的内容")).toBeDefined();
    expect(screen.getByText("标签: 3 个条目带的标签没有带出")).toBeDefined();
    expect(screen.queryByText("已导出的附件")).toBeNull();
  });
});

describe("导出对话框: 结果页的操作", () => {
  it("打开所在文件夹交给主进程, 失败时给出提示", async () => {
    const environment = await openExportDialog({
      exportBridgeOverrides: { revealFile: failingExportWith("reveal-failed") },
    });
    await startPlaintextExport();

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "打开所在文件夹" }));

    expect(environment.exportBridge.revealFile).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("无法打开所在文件夹.")).toBeDefined();
  });

  it("点完成关闭对话框并让主进程忘掉导出路径", async () => {
    const environment = await openExportDialog();
    await startPlaintextExport();

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "完成" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.exportBridge.cancel).toHaveBeenCalledTimes(1);
  });

  it("没有导出时点关闭同样让主进程释放", async () => {
    const environment = await openExportDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.exportBridge.cancel).toHaveBeenCalledTimes(1);
  });
});

describe("导出对话框: 导出失败", () => {
  it("写文件失败时留在确认步骤并说明没有留下文件", async () => {
    await openExportDialog({
      exportBridgeOverrides: { run: failingExportWith("write-failed") },
    });

    await startPlaintextExport();

    expect(
      await screen.findByText(
        "无法写出文件, 没有留下任何文件. 请换一个位置重试.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "导出..." })).toBeDefined();
  });
});
