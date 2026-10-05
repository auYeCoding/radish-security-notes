import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import { withinFieldRow } from "@renderer/testing/render-custom-type-form";
import { renderOpenedCustomTypeEditForm } from "@renderer/testing/render-custom-type-edit-form";
import { renderOpenedNewEntryDialog } from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 点保存修改.
 */
async function submitEdit(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "保存修改" }));
}

describe("类型选择里的自定义类型格菜单", () => {
  it("只有自定义类型格有 更多 菜单, 预设类型格没有", async () => {
    await renderOpenedNewEntryDialog(<NewEntryTrigger />, {
      customEntryTypes: [ROUTER_TYPE],
    });

    expect(
      screen.getByRole("button", { name: "路由器 的更多操作" }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "服务器 的更多操作" }),
    ).toBeNull();
    expect(screen.getAllByRole("button", { name: /的更多操作$/ })).toHaveLength(
      1,
    );
  });

  it("菜单里是编辑类型与删除类型两项", async () => {
    await renderOpenedNewEntryDialog(<NewEntryTrigger />, {
      customEntryTypes: [ROUTER_TYPE],
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "路由器 的更多操作" }));

    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual(["编辑类型", "删除类型"]);
  });
});

describe("编辑类型表单的呈现", () => {
  it("预填类型名称与每个字段的名称, 形态, 保密与摘要", async () => {
    await renderOpenedCustomTypeEditForm(<NewEntryTrigger />, "路由器", {
      customEntryTypes: [ROUTER_TYPE],
    });

    expect((screen.getByLabelText("类型名称") as HTMLInputElement).value).toBe(
      "路由器",
    );
    expect(
      (withinFieldRow(1).getByLabelText("字段名") as HTMLInputElement).value,
    ).toBe("地址");
    expect(
      withinFieldRow(1).getByRole("radio").getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      withinFieldRow(2)
        .getByRole("checkbox", { name: "保密" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      withinFieldRow(3).getByRole("combobox", { name: "取值形态" }).textContent,
    ).toContain("多行文本");
  });

  it("返回按钮回到类型选择, 不修改", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE] },
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "返回" }));

    expect(
      await screen.findByRole("dialog", { name: "选择条目类型" }),
    ).toBeDefined();
    expect(entryTypeBridge.update).not.toHaveBeenCalled();
  });
});

describe("编辑类型表单的保存", () => {
  it("改名保存后回到类型选择, 格子是新名称, 桥收到带字段键的修改", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE] },
    );
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("类型名称"));
    await user.type(screen.getByLabelText("类型名称"), "家用路由器");
    await submitEdit();

    expect(
      await screen.findByRole("button", { name: "家用路由器" }),
    ).toBeDefined();
    expect(entryTypeBridge.update).toHaveBeenCalledWith({
      id: "router",
      name: "家用路由器",
      fields: ROUTER_TYPE.fields.map((field) => ({
        ...field,
        isSummary: field.key === "account",
      })),
      isImpactConfirmed: false,
    });
  });

  it("添加的字段没有字段键, 排在末尾", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE] },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "添加字段" }));
    await user.type(withinFieldRow(4).getByLabelText("字段名"), "固件版本");
    await submitEdit();

    await screen.findByRole("dialog", { name: "选择条目类型" });
    const [input] = vi.mocked(entryTypeBridge.update).mock.calls[0];
    expect(input.fields).toHaveLength(4);
    expect(input.fields[3]).toMatchObject({ name: "固件版本" });
    expect("key" in input.fields[3]).toBe(false);
  });
});

describe("编辑类型表单的失败提示", () => {
  it("改成已有类型的名称时提示重名, 停留在编辑表单", async () => {
    await renderOpenedCustomTypeEditForm(<NewEntryTrigger />, "路由器", {
      customEntryTypes: [ROUTER_TYPE],
      entries: [ROUTER_ENTRY],
    });
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("类型名称"));
    await user.type(screen.getByLabelText("类型名称"), "服务器");
    await submitEdit();

    expect(
      await screen.findByText("已有同名的类型. 请换一个名称."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "编辑条目类型" })).toBeDefined();
  });

  it("名称为空时在名称下方提示, 不交给桥", async () => {
    const { entryTypeBridge } = await renderOpenedCustomTypeEditForm(
      <NewEntryTrigger />,
      "路由器",
      { customEntryTypes: [ROUTER_TYPE] },
    );

    await userEvent.setup().clear(screen.getByLabelText("类型名称"));
    await submitEdit();

    expect(await screen.findByText("请填写类型名称.")).toBeDefined();
    expect(entryTypeBridge.update).not.toHaveBeenCalled();
  });

  it("桥抛出错误时提示保存失败", async () => {
    await renderOpenedCustomTypeEditForm(<NewEntryTrigger />, "路由器", {
      customEntryTypes: [ROUTER_TYPE],
      entryTypeBridgeOverrides: {
        update: () => Promise.reject(new Error("ipc")),
      },
    });

    await submitEdit();

    expect(
      await screen.findByText("保存失败. 请关闭应用后重试."),
    ).toBeDefined();
  });
});
