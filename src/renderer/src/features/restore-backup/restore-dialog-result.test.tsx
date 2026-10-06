import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";

import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import { openRestorePreviewWith } from "@renderer/testing/open-restore-dialog";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 渲染恢复入口, 走完选择文件与确认恢复, 等结果页出现.
 * @returns 条目环境.
 */
async function openResult(): Promise<EntryTestEnvironment> {
  const environment = await openRestorePreviewWith(() => <RestoreTrigger />);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "开始恢复" }));
  await screen.findByText("恢复完成");
  return environment;
}

describe("恢复对话框: 确认恢复", () => {
  it("保险库是空的时请求只带清空确认 false, 不带主密码", async () => {
    const environment = await openResult();

    const run = vi.mocked<RestoreBridge["run"]>(environment.restoreBridge.run);
    expect(run).toHaveBeenCalledTimes(1);
    const request = run.mock.calls[0][0];
    expect(request).toEqual({ acknowledgesReplace: false });
    expect(request).not.toHaveProperty("masterPassword");
  });

  it("恢复成功后刷新自定义类型, 条目, 文件夹与标签", async () => {
    const environment = await openResult();

    await waitFor(() =>
      expect(environment.entryBridge.list).toHaveBeenCalled(),
    );
    expect(environment.entryTypeBridge.list).toHaveBeenCalled();
    expect(environment.folderBridge.list).toHaveBeenCalled();
    expect(environment.tagBridge.list).toHaveBeenCalled();
  });
});

describe("恢复对话框: 结果", () => {
  it("显示恢复出来的各类个数与不在备份里的内容, 没有替换说明", async () => {
    await openResult();

    const rows = screen
      .getAllByRole("definition")
      .map((row) => row.textContent);
    expect(rows).toEqual(["8", "2", "3", "1", "3"]);
    expect(screen.getByText("不在备份里的内容")).toBeDefined();
    expect(
      screen.getByText(/邮箱设置, 授权码, 备份口令, 自动备份计划, 主密码/),
    ).toBeDefined();
    expect(
      screen.queryByText("已清空原有数据, 并替换为备份里的内容."),
    ).toBeNull();
  });

  it("点完成关闭对话框并让主进程释放内存里的内容", async () => {
    const environment = await openResult();

    await userEvent.setup().click(screen.getByRole("button", { name: "完成" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
  });
});
