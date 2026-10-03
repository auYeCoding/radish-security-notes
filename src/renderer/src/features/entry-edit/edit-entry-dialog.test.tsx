import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { entryFailed } from "@shared/entries/entry-result";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 渲染编辑入口, 打开钱包条目的编辑对话框.
 * @param overrides 覆盖假条目桥上的方法.
 * @returns 渲染所用的环境.
 */
function openWalletDialog(
  overrides: Parameters<typeof renderOpenedEditEntryDialog>[2] = {},
): ReturnType<typeof renderOpenedEditEntryDialog> {
  return renderOpenedEditEntryDialog(
    (detail) => <EditEntryTrigger detail={detail} />,
    WALLET_ENTRY,
    overrides,
  );
}

/**
 * 把名称改成另一个值, 让表单有未保存的修改.
 */
async function makeUnsavedChange(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("名称"), "改");
}

describe("编辑对话框取消与关闭: 没有修改", () => {
  it("点取消直接关闭, 不调用桥", async () => {
    const { entryBridge } = await openWalletDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).not.toHaveBeenCalled();
  });

  it("按 Esc 与点关闭按钮都直接关闭", async () => {
    await openWalletDialog();
    const user = userEvent.setup();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("编辑对话框取消与关闭: 有未保存的修改", () => {
  it("点取消先弹出放弃修改的确认, 对话框仍开着", async () => {
    const { entryBridge } = await openWalletDialog();
    await makeUnsavedChange();

    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    expect(await screen.findByText("放弃未保存的修改?")).toBeDefined();
    expect(
      screen.getByRole("dialog", { name: "编辑条目", hidden: true }),
    ).toBeDefined();
    expect(entryBridge.update).not.toHaveBeenCalled();
  });

  it("选继续编辑回到表单, 已改的内容还在", async () => {
    await openWalletDialog();
    await makeUnsavedChange();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "取消" }));

    await user.click(await screen.findByRole("button", { name: "继续编辑" }));

    await waitFor(() =>
      expect(screen.queryByText("放弃未保存的修改?")).toBeNull(),
    );
    expect((screen.getByLabelText("名称") as HTMLInputElement).value).toBe(
      "钱包改",
    );
  });

  it("选放弃修改关闭对话框, 不调用桥, 条目不变", async () => {
    const { entryBridge, entryStore } = await openWalletDialog();
    await makeUnsavedChange();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "取消" }));

    await user.click(await screen.findByRole("button", { name: "放弃修改" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).not.toHaveBeenCalled();
    expect(entryStore.getState().entries[0]?.name).toBe("钱包");
  });

  it("按 Esc 同样先确认, 重新打开后是条目的现值", async () => {
    await openWalletDialog();
    await makeUnsavedChange();
    const user = userEvent.setup();

    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "放弃修改" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: "编辑条目" }));

    expect(
      ((await screen.findByLabelText("名称")) as HTMLInputElement).value,
    ).toBe("钱包");
  });
});

describe("编辑对话框保存失败", () => {
  it("输入被主进程拒绝时显示原因, 对话框与已填内容保留", async () => {
    await openWalletDialog({
      entryBridgeOverrides: {
        update: () => Promise.resolve(entryFailed("invalid-input")),
      },
    });
    await makeUnsavedChange();

    await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("内容不符合要求. 请检查后重试."),
    ).toBeDefined();
    expect((screen.getByLabelText("名称") as HTMLInputElement).value).toBe(
      "钱包改",
    );
  });

  it("条目已不存在或接口抛出错误时显示对应原因", async () => {
    await openWalletDialog({
      entryBridgeOverrides: {
        update: () => Promise.resolve(entryFailed("not-found")),
      },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("这个条目已不存在.")).toBeDefined();
  });

  it("接口抛出错误时显示保存失败", async () => {
    await openWalletDialog({
      entryBridgeOverrides: {
        update: () => Promise.reject(new Error("ipc")),
      },
    });

    await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("保存失败. 请关闭应用后重试."),
    ).toBeDefined();
  });
});
