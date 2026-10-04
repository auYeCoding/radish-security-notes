import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 渲染编辑入口, 打开路由器条目的编辑对话框.
 * @returns 渲染所用的环境.
 */
function openRouterDialog(): ReturnType<typeof renderOpenedEditEntryDialog> {
  return renderOpenedEditEntryDialog(
    (detail) => <EditEntryTrigger detail={detail} />,
    ROUTER_ENTRY,
    { customEntryTypes: [ROUTER_TYPE] },
  );
}

/**
 * 取一个文本输入框.
 * @param label 输入框的标签.
 * @returns 输入框元素.
 */
function getInput(label: string): HTMLInputElement | HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

describe("编辑自定义类型的条目", () => {
  it("字段预填现值, 字段名是自己定的, 类型只作标签显示", async () => {
    await openRouterDialog();

    const dialog = screen.getByRole("dialog", { name: "编辑条目" });
    expect(getInput("名称").value).toBe("家里路由器");
    expect(getInput("地址").value).toBe("192.168.1.1");
    expect(getInput("说明").value).toBe("机房左侧\n第二行");
    expect(within(dialog).getByText("路由器")).toBeDefined();
  });

  it("保密字段预填现值并默认遮罩, 点显示后是明文", async () => {
    await openRouterDialog();
    const user = userEvent.setup();

    expect(getInput("口令").type).toBe("password");
    expect(getInput("口令").value).toBe("router-secret-pass");
    await user.click(screen.getByRole("button", { name: "显示 口令" }));

    expect(getInput("口令").type).toBe("text");
  });

  it("改完保存, 带着自定义字段键交给桥, 对话框关闭", async () => {
    const { entryBridge } = await openRouterDialog();
    const user = userEvent.setup();

    await user.clear(getInput("地址"));
    await user.type(getInput("地址"), "10.0.0.1");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      ROUTER_ENTRY.id,
      expect.objectContaining({
        fields: {
          account: "10.0.0.1",
          "field-pass": "router-secret-pass",
          "field-note": "机房左侧\n第二行",
        },
      }),
    );
  });
});
