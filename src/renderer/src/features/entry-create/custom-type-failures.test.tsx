import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import {
  CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
  CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH,
} from "@shared/entries/custom-types/custom-entry-type-limits";
import { customEntryTypeFailed } from "@shared/entries/custom-types/custom-entry-type-result";
import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import {
  renderOpenedCustomTypeForm,
  withinFieldRow,
} from "@renderer/testing/render-custom-type-form";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 点保存类型.
 */
async function submitType(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "保存类型" }));
}

/**
 * 填写类型名称与第一个字段的字段名.
 * @param typeName 类型名称.
 * @param fieldName 字段名.
 */
async function fillFirst(typeName: string, fieldName: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("类型名称"), typeName);
  await user.type(withinFieldRow(1).getByLabelText("字段名"), fieldName);
}

describe("新建类型表单的校验提示", () => {
  it("名称与字段名为空时在输入下方提示, 不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );

    await submitType();

    expect(await screen.findByText("请填写类型名称.")).toBeDefined();
    expect(screen.getByText("请填写字段名.")).toBeDefined();
    expect(entryTypeBridge.create).not.toHaveBeenCalled();
  });

  it("字段名重复时提示, 不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );
    const user = userEvent.setup();

    await fillFirst("交换机", "地址");
    await user.click(screen.getByRole("button", { name: "添加字段" }));
    await user.type(withinFieldRow(2).getByLabelText("字段名"), "地址");
    await submitType();

    expect(await screen.findByText("字段名与前面的字段重复.")).toBeDefined();
    expect(entryTypeBridge.create).not.toHaveBeenCalled();
  });
});

/**
 * 把一段文字一次性粘贴进输入框, 用于输入超长的名称.
 * @param input 输入框.
 * @param text 要粘贴的文字.
 */
async function pasteInto(input: HTMLElement, text: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(input);
  await user.paste(text);
}

/**
 * 断言对话框仍停留在新建类型表单, 且没有把类型交给桥.
 * @param create 假桥上的新建方法.
 */
function expectStillInTypeForm(create: CustomEntryTypeBridge["create"]): void {
  expect(screen.getByRole("dialog", { name: "新建条目类型" })).toBeDefined();
  expect(create).not.toHaveBeenCalled();
}

describe("新建类型表单的没有字段与超长提示", () => {
  it("没有字段时在字段区下方提示, 停留在表单, 不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("类型名称"), "交换机");
    await user.click(screen.getByRole("button", { name: "删除字段 1" }));
    await submitType();

    expect(await screen.findByText("至少添加一个字段.")).toBeDefined();
    expectStillInTypeForm(entryTypeBridge.create);
  });

  it("类型名称超过上限时在名称下方提示, 停留在表单, 不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );
    const nameInput = screen.getByLabelText("类型名称");

    await pasteInto(
      nameInput,
      "类".repeat(CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH + 1),
    );
    await userEvent
      .setup()
      .type(withinFieldRow(1).getByLabelText("字段名"), "地址");
    await submitType();

    expect(await screen.findByText("类型名称最多 50 个字符.")).toBeDefined();
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expectStillInTypeForm(entryTypeBridge.create);
  });

  it("字段名超过上限时在字段名下方提示, 停留在表单, 不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );
    const fieldNameInput = withinFieldRow(1).getByLabelText("字段名");

    await userEvent.setup().type(screen.getByLabelText("类型名称"), "交换机");
    await pasteInto(
      fieldNameInput,
      "字".repeat(CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH + 1),
    );
    await submitType();

    expect(await screen.findByText("字段名最多 50 个字符.")).toBeDefined();
    expect(fieldNameInput.getAttribute("aria-invalid")).toBe("true");
    expectStillInTypeForm(entryTypeBridge.create);
  });
});

describe("新建类型失败的提示", () => {
  it("与已有类型重名时提示, 停留在表单, 类型列表不变", async () => {
    const { entryTypeStore } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
      { customEntryTypes: [ROUTER_TYPE] },
    );

    await fillFirst("路由器", "地址");
    await submitType();

    expect(
      await screen.findByText("已有同名的类型. 请换一个名称."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "新建条目类型" })).toBeDefined();
    expect(entryTypeStore.getState().customTypes).toEqual([ROUTER_TYPE]);
  });

  it("与预设类型重名时同样提示", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);

    await fillFirst("服务器", "地址");
    await submitType();

    expect(
      await screen.findByText("已有同名的类型. 请换一个名称."),
    ).toBeDefined();
  });

  it("个数已达上限时提示上限", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />, {
      entryTypeBridgeOverrides: {
        create: () => Promise.resolve(customEntryTypeFailed("limit-reached")),
      },
    });

    await fillFirst("交换机", "地址");
    await submitType();

    expect(await screen.findByText("自定义类型已达 50 个上限.")).toBeDefined();
  });

  it("桥抛出错误时提示保存失败", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />, {
      entryTypeBridgeOverrides: {
        create: () => Promise.reject(new Error("ipc")),
      },
    });

    await fillFirst("交换机", "地址");
    await submitType();

    expect(
      await screen.findByText("保存失败. 请关闭应用后重试."),
    ).toBeDefined();
  });
});
