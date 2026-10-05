import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  customEntryTypeFailed,
  customEntryTypeSucceeded,
} from "@shared/entries/custom-types/custom-entry-type-result";
import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import { renderOpenedCustomTypeEditForm } from "@renderer/testing/render-custom-type-edit-form";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 点保存修改.
 */
async function submitEdit(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "保存修改" }));
}

/**
 * 在编辑表单里删除第二个字段 "口令".
 */
async function removeSecretField(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "删除字段 2" }));
}

/**
 * 取出影响确认框, 等它出现.
 * @returns 确认框内的查询工具.
 */
async function findImpactDialog(): Promise<ReturnType<typeof within>> {
  const dialog = await screen.findByRole("alertdialog", {
    name: "确认保存对类型的修改?",
  });
  return within(dialog);
}

describe("删除字段前的影响确认", () => {
  it("类型下有条目时先弹确认, 写明被删字段名与条目数, 此时不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE], entries: [ROUTER_ENTRY] },
    );

    await removeSecretField();
    await submitEdit();

    const dialog = await findImpactDialog();
    expect(
      dialog.getByText(
        /将删除字段 "口令", 该类型下 1 个条目里这些字段的取值会被清除/,
      ),
    ).toBeDefined();
    expect(entryTypeBridge.update).not.toHaveBeenCalled();
  });

  it("返回修改回到表单, 不保存", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE], entries: [ROUTER_ENTRY] },
    );

    await removeSecretField();
    await submitEdit();
    await userEvent
      .setup()
      .click(
        (await findImpactDialog()).getByRole("button", { name: "返回修改" }),
      );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("dialog", { name: "编辑条目类型" })).toBeDefined();
    expect(entryTypeBridge.update).not.toHaveBeenCalled();
  });
});

describe("确认删除字段的影响后保存", () => {
  it("确认并保存后带确认标记交给桥, 回到类型选择", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE], entries: [ROUTER_ENTRY] },
    );

    await removeSecretField();
    await submitEdit();
    await userEvent
      .setup()
      .click(
        (await findImpactDialog()).getByRole("button", { name: "确认并保存" }),
      );

    expect(
      await screen.findByRole("dialog", { name: "选择条目类型" }),
    ).toBeDefined();
    expect(entryTypeBridge.update).toHaveBeenCalledWith(
      expect.objectContaining({ isImpactConfirmed: true }),
    );
  });

  it("类型下没有条目时直接保存, 不弹确认", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE] },
    );

    await removeSecretField();
    await submitEdit();

    expect(
      await screen.findByRole("dialog", { name: "选择条目类型" }),
    ).toBeDefined();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(entryTypeBridge.update).toHaveBeenCalledWith(
      expect.objectContaining({ isImpactConfirmed: false }),
    );
  });
});

describe("保密属性改变前的确认", () => {
  it("保密字段改成非保密时先弹确认, 写明它将不再保密与可被搜索", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE] },
    );
    const group = screen.getByRole("group", { name: "字段 2" });

    await userEvent
      .setup()
      .click(within(group).getByRole("checkbox", { name: "保密" }));
    await submitEdit();

    const dialog = await findImpactDialog();
    expect(
      dialog.getByText(
        /字段 "口令" 将不再保密, 它的取值不再默认遮掩, 并且可以被搜索到/,
      ),
    ).toBeDefined();
    expect(entryTypeBridge.update).not.toHaveBeenCalled();
  });

  it("非保密字段改成保密时不弹确认", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE], entries: [ROUTER_ENTRY] },
    );
    const group = screen.getByRole("group", { name: "字段 3" });

    await userEvent
      .setup()
      .click(within(group).getByRole("checkbox", { name: "保密" }));
    await submitEdit();

    await screen.findByRole("dialog", { name: "选择条目类型" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(entryTypeBridge.update).toHaveBeenCalledTimes(1);
  });
});

describe("主进程要求确认但界面没有预判到时", () => {
  it("弹出通用的确认, 确认后带确认标记重试", async () => {
    const attempts: boolean[] = [];
    await renderOpenedCustomTypeEditForm(<NewEntryTrigger />, "路由器", {
      customEntryTypes: [ROUTER_TYPE],
      entryTypeBridgeOverrides: {
        update: (input) => {
          attempts.push(input.isImpactConfirmed);
          return Promise.resolve(
            input.isImpactConfirmed
              ? customEntryTypeSucceeded(ROUTER_TYPE)
              : customEntryTypeFailed("confirmation-required"),
          );
        },
      },
    });

    await submitEdit();
    const dialog = await findImpactDialog();
    expect(
      dialog.getByText("这次修改会影响已有条目里保存的取值. 确认后才保存."),
    ).toBeDefined();
    await userEvent
      .setup()
      .click(dialog.getByRole("button", { name: "确认并保存" }));

    await screen.findByRole("dialog", { name: "选择条目类型" });
    expect(attempts).toEqual([false, true]);
  });
});
