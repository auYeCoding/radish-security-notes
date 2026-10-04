import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { entryFailed } from "@shared/entries/entry-result";
import { describe, expect, it } from "vitest";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  TEST_ENTRIES,
  WALLET_ENTRY,
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

/**
 * 按名称取按钮并判断是否禁用.
 * @param name 按钮的名称.
 * @returns 按钮禁用时为 true.
 */
function isButtonDisabled(name: string): boolean {
  return (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;
}

/**
 * 取详情里全部字段名的文字, 按显示顺序.
 * @returns 字段名列表.
 */
function readLabels(): (string | null)[] {
  return Array.from(document.querySelectorAll("dt")).map(
    (term) => term.textContent,
  );
}

describe("EntryDetailPane 展示", () => {
  it("没有选中时提示选择条目", async () => {
    await renderPane();

    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });

  it("选中后标明类型, 显示名称与账号, 密码默认遮罩", async () => {
    await renderPane("forum");

    expect(screen.getByRole("heading", { name: "论坛" })).toBeDefined();
    expect(screen.getByText("通用登录")).toBeDefined();
    expect(screen.getByText("forum-account")).toBeDefined();
    expect(screen.queryByText("forum-password")).toBeNull();
    expect(screen.getByText("密码 已隐藏")).toBeDefined();
  });

  it("点击显示按钮显示明文, 再点击恢复遮罩", async () => {
    await renderPane("forum");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "显示 密码" }));
    expect(screen.getByText("forum-password")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "隐藏 密码" }));
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
    await user.click(screen.getByRole("button", { name: "显示 密码" }));

    await entryStore.getState().select("bank");

    expect(await screen.findByRole("heading", { name: "银行" })).toBeDefined();
    expect(screen.queryByText(BANK_ENTRY.fields["password"] ?? "")).toBeNull();
    expect(screen.getByRole("button", { name: "显示 密码" })).toBeDefined();
  });

  it("类型字段与备注没有填写时显示未填写, 复制按钮禁用, 没有显示按钮", async () => {
    await renderPane("empty", {
      entries: [
        {
          id: "empty",
          name: "只有名称",
          type: "login",
          account: "",
          fields: { account: "", password: "", url: "" },
          notes: "",
          notesFormat: "plain",
          customFields: [],
          hasTotp: false,
        },
      ],
    });

    expect(screen.getAllByText("未填写")).toHaveLength(4);
    for (const name of ["复制 账号", "复制 密码", "复制 网址", "复制 备注"]) {
      expect(isButtonDisabled(name)).toBe(true);
    }
    expect(screen.queryByRole("button", { name: "显示 密码" })).toBeNull();
  });
});

/**
 * 选中钱包条目 (带网址, 备注与三个自定义字段) 后渲染详情窗格.
 * @param options 条目环境的选项覆盖.
 * @returns 渲染所用的环境.
 */
function renderWalletPane(
  options: Partial<EntryTestEnvironmentOptions> = {},
): Promise<EntryTestEnvironment> {
  return renderPane("wallet", {
    entries: [WALLET_ENTRY, ...TEST_ENTRIES],
    ...options,
  });
}

describe("EntryDetailPane 类型字段, 自定义字段与备注", () => {
  it("按类型字段, 自定义字段, 备注的顺序展示", async () => {
    await renderWalletPane();

    expect(readLabels()).toEqual([
      "账号",
      "密码",
      "网址",
      "取款码",
      "助记词",
      "备用编号",
      "备注",
    ]);
    expect(
      screen.getByText(WALLET_ENTRY.fields["url"] ?? "missing"),
    ).toBeDefined();
  });

  it("没有自定义字段时不显示任何自定义字段行", async () => {
    await renderPane("forum");

    expect(readLabels()).toEqual(["账号", "密码", "网址", "备注"]);
  });

  it("备注与多行字段值保留换行", async () => {
    await renderWalletPane();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "显示 助记词" }));

    const notes = screen.getByText("备注第一行 备注第二行");
    const seed = screen.getByText("seed-one seed-two seed-three seed-four");

    expect(notes.textContent).toBe("备注第一行\n备注第二行");
    expect(notes.className).toContain("whitespace-pre-wrap");
    expect(seed.textContent).toBe("seed-one seed-two\nseed-three seed-four");
    expect(seed.className).toContain("whitespace-pre-wrap");
  });
});

describe("EntryDetailPane 自定义字段的遮罩与空值", () => {
  it("普通字段明文显示, 隐藏字段默认遮罩, 点击显示与隐藏切换", async () => {
    await renderWalletPane();
    const user = userEvent.setup();

    expect(screen.getByText("pin-1234")).toBeDefined();
    expect(screen.queryByText(/seed-one/)).toBeNull();
    expect(screen.getByText("助记词 已隐藏")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "显示 助记词" }));
    expect(screen.getByText(/seed-one/)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "隐藏 助记词" }));
    expect(screen.queryByText(/seed-one/)).toBeNull();
    expect(screen.queryByRole("button", { name: "显示 取款码" })).toBeNull();
  });

  it("自定义字段的值为空时显示未填写, 复制禁用, 隐藏字段没有显示按钮", async () => {
    await renderWalletPane();

    expect(screen.getAllByText("未填写")).toHaveLength(1);
    expect(isButtonDisabled("复制 备用编号")).toBe(true);
    expect(isButtonDisabled("复制 取款码")).toBe(false);
  });

  it("切换条目后再回来, 隐藏字段恢复遮罩", async () => {
    const { entryStore } = await renderWalletPane();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "显示 助记词" }));

    await entryStore.getState().select("forum");
    await screen.findByRole("heading", { name: "论坛" });
    await entryStore.getState().select("wallet");

    expect(await screen.findByRole("heading", { name: "钱包" })).toBeDefined();
    expect(screen.queryByText(/seed-one/)).toBeNull();
  });
});

describe("EntryDetailPane 复制备注与自定义字段", () => {
  it("复制网址与备注把编号和字段名交给桥", async () => {
    const { entryBridge } = await renderWalletPane();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "复制 网址" }));
    expect(entryBridge.copyField).toHaveBeenLastCalledWith("wallet", "url");

    await user.click(screen.getByRole("button", { name: "复制 备注" }));
    expect(entryBridge.copyField).toHaveBeenLastCalledWith("wallet", "notes");
  });

  it("复制普通与隐藏的自定义字段把条目编号和字段编号交给桥, 隐藏字段不必先显示", async () => {
    const { entryBridge } = await renderWalletPane();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "复制 取款码" }));
    expect(entryBridge.copyCustomField).toHaveBeenLastCalledWith(
      "wallet",
      "wallet-pin",
    );
    expect(
      screen.getByRole("button", { name: "复制 取款码" }).textContent,
    ).toBe("已复制");

    await user.click(screen.getByRole("button", { name: "复制 助记词" }));
    expect(entryBridge.copyCustomField).toHaveBeenLastCalledWith(
      "wallet",
      "wallet-seed",
    );
    expect(screen.queryByText(/seed-one/)).toBeNull();
  });

  it("复制自定义字段失败时不显示已复制", async () => {
    await renderWalletPane({
      entryBridgeOverrides: {
        copyCustomField: () => Promise.resolve(entryFailed("not-found")),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "复制 取款码" }));

    expect(
      screen.getByRole("button", { name: "复制 取款码" }).textContent,
    ).toBe("");
  });
});

describe("EntryDetailPane 复制类型字段", () => {
  it("复制账号与密码把编号和字段键交给桥, 并显示已复制", async () => {
    const { entryBridge } = await renderPane("forum");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "复制 账号" }));
    expect(entryBridge.copyField).toHaveBeenLastCalledWith(
      FORUM_ENTRY.id,
      "account",
    );
    expect(screen.getByRole("button", { name: "复制 账号" }).textContent).toBe(
      "已复制",
    );

    await user.click(screen.getByRole("button", { name: "复制 密码" }));
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
      .click(screen.getByRole("button", { name: "复制 账号" }));

    expect(screen.getByRole("button", { name: "复制 账号" }).textContent).toBe(
      "",
    );
  });
});
