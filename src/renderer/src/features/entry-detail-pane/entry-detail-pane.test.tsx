import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { entryFailed } from "@shared/entries/entry-result";
import { describe, expect, it } from "vitest";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  TEST_ENTRIES,
} from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 在条目环境里选中一个条目后渲染详情窗格.
 * @param id 要选中的条目编号, 不给时不选中.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderPane(
  id?: string,
  options: EntryTestEnvironmentOptions = { entries: TEST_ENTRIES },
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  if (id !== undefined) {
    await environment.entryStore.getState().select(id);
  }
  render(<EntryDetailPane />, { wrapper: environment.Providers });
  return environment;
}

describe("EntryDetailPane 展示", () => {
  it("没有选中时提示选择条目", async () => {
    await renderPane();

    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });

  it("选中后显示名称与账号, 密码默认遮罩", async () => {
    await renderPane("forum");

    expect(screen.getByRole("heading", { name: "论坛" })).toBeDefined();
    expect(screen.getByText("forum-account")).toBeDefined();
    expect(screen.queryByText("forum-password")).toBeNull();
    expect(screen.getByText("密码已隐藏")).toBeDefined();
  });

  it("点击显示按钮显示明文, 再点击恢复遮罩", async () => {
    await renderPane("forum");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "显示密码" }));
    expect(screen.getByText("forum-password")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(screen.queryByText("forum-password")).toBeNull();
  });

  it("读取详情失败时说明原因", async () => {
    await renderPane("forum", {
      entries: TEST_ENTRIES,
      entryBridgeOverrides: {
        get: () => Promise.resolve(entryFailed("not-found")),
      },
    });

    expect(screen.getByText("无法读取这个条目的详情.")).toBeDefined();
  });
});

describe("EntryDetailPane 切换与空字段", () => {
  it("切换到别的条目后密码恢复遮罩", async () => {
    const { entryStore } = await renderPane("forum");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "显示密码" }));

    await entryStore.getState().select("bank");

    expect(await screen.findByRole("heading", { name: "银行" })).toBeDefined();
    expect(screen.queryByText(BANK_ENTRY.password)).toBeNull();
    expect(screen.getByRole("button", { name: "显示密码" })).toBeDefined();
  });

  it("账号与密码没有填写时显示未填写, 复制按钮禁用, 没有显示按钮", async () => {
    await renderPane("empty", {
      entries: [{ id: "empty", name: "只有名称", account: "", password: "" }],
    });

    expect(screen.getAllByText("未填写")).toHaveLength(2);
    expect(
      (screen.getByRole("button", { name: "复制账号" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "复制密码" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "显示密码" })).toBeNull();
  });
});

describe("EntryDetailPane 复制", () => {
  it("复制账号与密码把编号和字段名交给桥, 并显示已复制", async () => {
    const { entryBridge } = await renderPane("forum");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "复制账号" }));
    expect(entryBridge.copyField).toHaveBeenLastCalledWith(
      FORUM_ENTRY.id,
      "account",
    );
    expect(screen.getByRole("button", { name: "复制账号" }).textContent).toBe(
      "已复制",
    );

    await user.click(screen.getByRole("button", { name: "复制密码" }));
    expect(entryBridge.copyField).toHaveBeenLastCalledWith(
      FORUM_ENTRY.id,
      "password",
    );
  });

  it("复制失败时不显示已复制", async () => {
    await renderPane("forum", {
      entries: TEST_ENTRIES,
      entryBridgeOverrides: {
        copyField: () => Promise.resolve(entryFailed("not-found")),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "复制账号" }));

    expect(screen.getByRole("button", { name: "复制账号" }).textContent).toBe(
      "",
    );
  });
});
