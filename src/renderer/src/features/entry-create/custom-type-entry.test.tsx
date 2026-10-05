import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";
import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import {
  renderOpenedCustomTypeForm,
  withinFieldRow,
} from "@renderer/testing/render-custom-type-form";
import { renderOpenedNewEntryDialog } from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 在新建类型表单里填写类型名称, 并给第一个字段填字段名.
 * @param typeName 类型名称.
 * @param fieldName 第一个字段的字段名.
 */
async function fillTypeNameAndFirstField(
  typeName: string,
  fieldName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("类型名称"), typeName);
  await user.type(withinFieldRow(1).getByLabelText("字段名"), fieldName);
}

describe("类型选择里的新建类型入口", () => {
  it("网格末尾有 新建类型 格, 在全部预设类型之后", async () => {
    await renderOpenedNewEntryDialog(<NewEntryTrigger />);

    const group = screen.getByRole("group", { name: "选择条目类型" });
    const names = Array.from(group.querySelectorAll("button")).map(
      (button) => button.textContent,
    );

    expect(names).toHaveLength(PRESET_ENTRY_TYPES.length + 1);
    expect(names.at(-1)).toBe("新建类型");
  });

  it("已有的自定义类型排在预设之后, 新建类型格之前", async () => {
    await renderOpenedNewEntryDialog(<NewEntryTrigger />, {
      customEntryTypes: [ROUTER_TYPE],
    });

    const group = screen.getByRole("group", { name: "选择条目类型" });
    const names = Array.from(group.querySelectorAll("button"))
      .filter((button) => !button.hasAttribute("aria-haspopup"))
      .map((button) => button.textContent);

    expect(names.slice(-2)).toEqual(["路由器", "新建类型"]);
  });

  it("点新建类型格进入类型表单: 名称输入与一个空字段行, 返回回到类型选择", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    expect(screen.getByLabelText("类型名称")).toBeDefined();
    expect(withinFieldRow(1).getByLabelText("字段名")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "返回" }));

    expect(
      await screen.findByRole("dialog", { name: "选择条目类型" }),
    ).toBeDefined();
  });
});

describe("新建类型后直接用它新建条目", () => {
  it("保存类型后进入该类型的新建条目表单, 字段名是自己定的", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );
    const user = userEvent.setup();

    await fillTypeNameAndFirstField("交换机", "管理地址");
    await user.click(screen.getByRole("button", { name: "保存类型" }));

    expect(
      await screen.findByRole("dialog", { name: "新建条目" }),
    ).toBeDefined();
    expect(entryTypeBridge.create).toHaveBeenCalledWith({
      name: "交换机",
      fields: [
        {
          name: "管理地址",
          kind: "singleLine",
          isSensitive: false,
          isSummary: false,
        },
      ],
    });
    expect(screen.getByLabelText("管理地址")).toBeDefined();
  });
});

describe("用新类型新建的条目", () => {
  it("保存条目时带自定义类型键, 摘要字段按 account 存", async () => {
    const { entryBridge } = await renderOpenedCustomTypeForm(
      <NewEntryTrigger />,
    );
    const user = userEvent.setup();

    await fillTypeNameAndFirstField("交换机", "管理地址");
    await user.click(withinFieldRow(1).getByRole("radio"));
    await user.click(screen.getByRole("button", { name: "保存类型" }));
    await screen.findByRole("dialog", { name: "新建条目" });
    await user.type(screen.getByLabelText("名称"), "机房交换机");
    await user.type(screen.getByLabelText("管理地址"), "10.0.0.2");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "custom:created-type-1",
        name: "机房交换机",
        fields: { account: "10.0.0.2" },
      }),
    );
  });
});
