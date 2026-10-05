import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  chooseTypeMenuItem,
  renderOpenedDialogWithEntries,
} from "@renderer/testing/render-custom-type-edit-form";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 打开删除确认框后的测试环境.
 */
interface OpenedDeleteDialog {
  /**
   * 渲染所用的环境.
   */
  readonly environment: EntryTestEnvironment;
  /**
   * 确认框内的查询工具.
   */
  readonly dialog: ReturnType<typeof within>;
}

/**
 * 打开类型选择, 经路由器类型格的菜单打开删除确认框.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境与确认框内的查询工具.
 */
async function openDeleteDialog(
  options: EntryTestEnvironmentOptions,
): Promise<OpenedDeleteDialog> {
  const environment = await renderOpenedDialogWithEntries(
    <NewEntryTrigger />,
    options,
  );
  await chooseTypeMenuItem("路由器", "删除类型");
  const dialog = within(
    await screen.findByRole("alertdialog", { name: "删除这个类型?" }),
  );
  return { environment, dialog };
}

describe("删除类型确认框的文案", () => {
  it("类型下没有条目时只写明类型名称与无法恢复", async () => {
    const { dialog } = await openDeleteDialog({
      customEntryTypes: [ROUTER_TYPE],
    });

    expect(dialog.getByText('类型 "路由器" 将被删除, 无法恢复.')).toBeDefined();
  });

  it("类型下有条目时写明条目数, 不会被删除而是改归安全笔记, 取值转成自定义字段", async () => {
    const { dialog } = await openDeleteDialog({
      customEntryTypes: [ROUTER_TYPE],
      entries: [ROUTER_ENTRY],
    });

    expect(
      dialog.getByText(
        /它名下的 1 个条目不会被删除, 会改归 "安全笔记", 字段取值转成条目的自定义字段 \(保密字段转成隐藏字段\)/,
      ),
    ).toBeDefined();
  });
});

describe("删除类型的确认与取消", () => {
  it("取消后什么都不做, 类型格仍在", async () => {
    const { environment, dialog } = await openDeleteDialog({
      customEntryTypes: [ROUTER_TYPE],
    });

    await userEvent.setup().click(dialog.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.entryTypeBridge.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "路由器" })).toBeDefined();
  });

  it("确认后带确认标记交给桥, 类型格消失", async () => {
    const { environment, dialog } = await openDeleteDialog({
      customEntryTypes: [ROUTER_TYPE],
      entries: [ROUTER_ENTRY],
    });

    await userEvent
      .setup()
      .click(dialog.getByRole("button", { name: "删除类型" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.entryTypeBridge.remove).toHaveBeenCalledWith({
      id: "router",
      isImpactConfirmed: true,
    });
    expect(screen.queryByRole("button", { name: "路由器" })).toBeNull();
    expect(environment.entryTypeStore.getState().customTypes).toEqual([]);
  });

  it("桥抛出错误时确认框里提示失败, 类型仍在", async () => {
    const { environment, dialog } = await openDeleteDialog({
      customEntryTypes: [ROUTER_TYPE],
      entryTypeBridgeOverrides: {
        remove: () => Promise.reject(new Error("ipc")),
      },
    });

    await userEvent
      .setup()
      .click(dialog.getByRole("button", { name: "删除类型" }));

    expect(
      await dialog.findByText("保存失败. 请关闭应用后重试."),
    ).toBeDefined();
    expect(environment.entryTypeStore.getState().customTypes).toEqual([
      ROUTER_TYPE,
    ]);
  });
});
