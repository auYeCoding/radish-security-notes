import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 选中路由器条目后渲染详情窗格.
 * @returns 渲染所用的环境.
 */
async function renderRouterPane(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [ROUTER_ENTRY],
    customEntryTypes: [ROUTER_TYPE],
  });
  await environment.entryStore.getState().select(ROUTER_ENTRY.id);
  render(<EntryDetailPane />, { wrapper: environment.Providers });
  return environment;
}

describe("EntryDetailPane 自定义类型的条目", () => {
  it("标明自定义类型名, 按类型字段顺序展示, 字段名是自己定的, 备注在最后", async () => {
    await renderRouterPane();

    const labels = Array.from(document.querySelectorAll("dt")).map(
      (term) => term.textContent,
    );

    expect(screen.getByText("路由器")).toBeDefined();
    expect(labels).toEqual(["地址", "口令", "说明", "备注"]);
  });

  it("保密字段默认遮罩, 点显示后是明文, 普通字段始终明文, 多行保留换行", async () => {
    await renderRouterPane();
    const user = userEvent.setup();

    expect(screen.queryByText("router-secret-pass")).toBeNull();
    expect(screen.getByText("口令 已隐藏")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "显示 口令" }));

    expect(screen.getByText("router-secret-pass")).toBeDefined();
    expect(screen.getByText("192.168.1.1")).toBeDefined();
    expect(screen.getByText("机房左侧 第二行").textContent).toBe(
      "机房左侧\n第二行",
    );
  });
});

describe("EntryDetailPane 自定义类型的条目复制与缺失类型", () => {
  it("每个字段都能复制, 条目编号与字段键交给桥, 保密字段不必先显示", async () => {
    const { entryBridge } = await renderRouterPane();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "复制 地址" }));
    await user.click(screen.getByRole("button", { name: "复制 口令" }));
    await user.click(screen.getByRole("button", { name: "复制 说明" }));

    expect(entryBridge.copyField).toHaveBeenNthCalledWith(
      1,
      ROUTER_ENTRY.id,
      "account",
    );
    expect(entryBridge.copyField).toHaveBeenNthCalledWith(
      2,
      ROUTER_ENTRY.id,
      "field-pass",
    );
    expect(entryBridge.copyField).toHaveBeenNthCalledWith(
      3,
      ROUTER_ENTRY.id,
      "field-note",
    );
  });

  it("类型不在目录里时不渲染详情, 不抛错", async () => {
    const environment = await createEntryTestEnvironment({
      entries: [ROUTER_ENTRY],
    });
    await environment.entryStore.getState().select(ROUTER_ENTRY.id);

    render(<EntryDetailPane />, { wrapper: environment.Providers });

    expect(document.querySelectorAll("dt")).toHaveLength(0);
  });
});
