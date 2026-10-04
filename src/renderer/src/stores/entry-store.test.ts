import { entryFailed } from "@shared/entries/entry-result";
import { describe, expect, it, vi } from "vitest";

import {
  BANK_ENTRY as BANK,
  FORUM_ENTRY as FORUM,
} from "@renderer/testing/entry-fixtures";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import { createEntryStore } from "./entry-store";

/**
 * 通用登录的新建输入, 名称与全部字段都为空.
 */
const EMPTY_LOGIN_INPUT = {
  type: "login",
  name: "",
  fields: { account: "", password: "", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  totp: "",
} as const;

describe("条目 store 读取与选中", () => {
  it("初始状态是读取中, 没有条目也没有选中", () => {
    const store = createEntryStore({ bridge: createFakeEntryBridge() });

    expect(store.getState()).toMatchObject({
      entries: [],
      loadStatus: "loading",
      selection: { status: "none" },
      query: "",
    });
  });

  it("读取后列表只含摘要, 不含密码", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([FORUM, BANK]),
    });

    await store.getState().load();

    expect(store.getState().loadStatus).toBe("ready");
    expect(store.getState().entries).toEqual([
      { id: "forum", name: "论坛", type: "login", account: "forum-account" },
      { id: "bank", name: "银行", type: "login", account: "bank-account" },
    ]);
  });

  it("读取失败或抛出错误时标记失败", async () => {
    const failing = createEntryStore({
      bridge: createFakeEntryBridge([], {
        list: () => Promise.resolve(entryFailed("vault-locked")),
      }),
    });
    const throwing = createEntryStore({
      bridge: createFakeEntryBridge([], {
        list: () => Promise.reject(new Error("ipc")),
      }),
    });

    await failing.getState().load();
    await throwing.getState().load();

    expect(failing.getState().loadStatus).toBe("failed");
    expect(throwing.getState().loadStatus).toBe("failed");
  });
});

describe("条目 store 选中", () => {
  it("选中条目后读取详情, 含密码", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([FORUM]),
    });

    const pending = store.getState().select("forum");
    expect(store.getState().selection).toEqual({
      status: "loading",
      id: "forum",
    });
    await pending;

    expect(store.getState().selection).toEqual({
      status: "ready",
      detail: FORUM,
    });
  });

  it("详情读取失败时标记失败并保留选中编号", async () => {
    const store = createEntryStore({ bridge: createFakeEntryBridge() });

    await store.getState().select("missing");

    expect(store.getState().selection).toEqual({
      status: "failed",
      id: "missing",
    });
  });
});

describe("条目 store 选中竞争", () => {
  it("读取期间又选中别的条目时丢弃过时的详情", async () => {
    let releaseFirst: () => void = () => undefined;
    const bridge = createFakeEntryBridge([FORUM, BANK]);
    const originalGet = bridge.get;
    bridge.get = vi.fn(async (id: string) => {
      if (id === "forum") {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return originalGet(id);
    });
    const store = createEntryStore({ bridge });

    const first = store.getState().select("forum");
    await store.getState().select("bank");
    releaseFirst();
    await first;

    expect(store.getState().selection).toEqual({
      status: "ready",
      detail: BANK,
    });
  });
});

describe("条目 store 新建", () => {
  it("新建成功后放到列表最前, 选中并展示详情, 清空关键字", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([FORUM]),
    });
    await store.getState().load();
    store.getState().setQuery("zzz");

    const result = await store.getState().create({
      type: "login",
      name: " 新条目 ",
      fields: {
        account: "new-account",
        password: "new-password",
        url: "https://example.test",
      },
      notes: "第一行\n第二行",
      notesFormat: "markdown",
      customFields: [{ label: "助记词", value: "a b", isHidden: true }],
      totp: "",
    });

    expect(result.ok).toBe(true);
    expect(store.getState().entries.map((entry) => entry.name)).toEqual([
      "新条目",
      "论坛",
    ]);
    expect(store.getState().query).toBe("");
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: {
        name: "新条目",
        type: "login",
        account: "new-account",
        fields: {
          account: "new-account",
          password: "new-password",
          url: "https://example.test",
        },
        notes: "第一行\n第二行",
        notesFormat: "markdown",
        customFields: [{ label: "助记词", value: "a b", isHidden: true }],
      },
    });
  });
});

describe("条目 store 新建失败", () => {
  it("新建失败时不改动列表与选中, 并返回失败结果", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([], {
        create: () => Promise.resolve(entryFailed("invalid-input")),
      }),
    });

    const result = await store.getState().create(EMPTY_LOGIN_INPUT);

    expect(result).toEqual({ ok: false, reason: "invalid-input" });
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 异常与搜索", () => {
  it("接口调用抛出错误时新建返回意外错误", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([], {
        create: () => Promise.reject(new Error("ipc")),
      }),
    });

    const result = await store.getState().create({
      ...EMPTY_LOGIN_INPUT,
      name: "n",
    });

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
  });

  it("设置关键字只改关键字", () => {
    const store = createEntryStore({ bridge: createFakeEntryBridge() });

    store.getState().setQuery("abc");

    expect(store.getState().query).toBe("abc");
  });
});

describe("条目 store 复制", () => {
  it("复制把编号与字段名交给接口, 成功返回 true, 失败或抛错返回 false", async () => {
    const bridge = createFakeEntryBridge();
    const store = createEntryStore({ bridge });
    const failing = createEntryStore({
      bridge: createFakeEntryBridge([], {
        copyField: () => Promise.reject(new Error("ipc")),
      }),
    });

    const copied = await store.getState().copyField("forum", "password");
    const failed = await failing.getState().copyField("forum", "account");

    expect(bridge.copyField).toHaveBeenCalledWith("forum", "password");
    await store.getState().copyField("card", "cardNumber");
    expect(bridge.copyField).toHaveBeenLastCalledWith("card", "cardNumber");
    expect(copied).toBe(true);
    expect(failed).toBe(false);
  });

  it("复制自定义字段把条目编号与字段编号交给接口, 成功返回 true, 失败或抛错返回 false", async () => {
    const bridge = createFakeEntryBridge();
    const store = createEntryStore({ bridge });
    const rejected = createEntryStore({
      bridge: createFakeEntryBridge([], {
        copyCustomField: () => Promise.resolve(entryFailed("not-found")),
      }),
    });
    const throwing = createEntryStore({
      bridge: createFakeEntryBridge([], {
        copyCustomField: () => Promise.reject(new Error("ipc")),
      }),
    });

    const copied = await store.getState().copyCustomField("wallet", "seed");
    const failed = await rejected.getState().copyCustomField("wallet", "seed");
    const thrown = await throwing.getState().copyCustomField("wallet", "seed");

    expect(bridge.copyCustomField).toHaveBeenCalledWith("wallet", "seed");
    expect(copied).toBe(true);
    expect(failed).toBe(false);
    expect(thrown).toBe(false);
  });
});
