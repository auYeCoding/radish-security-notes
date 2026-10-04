import { afterEach, describe, expect, it, vi } from "vitest";

import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import {
  createEntryServiceFixture,
  createUnlockedEntryFixture,
  newEntryInputOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 放在保密位置的标记值, 小写, 不得出现在搜索结果与控制台输出里.
 */
const SECRET_PASSWORD = "canary-password-value";

/**
 * 新建一个含各类内容的登录条目的输入.
 * @param name 条目名称.
 * @returns 新建输入.
 */
function loginInput(name: string): ReturnType<typeof newEntryInputOf> {
  return newEntryInputOf({
    name,
    fields: {
      account: "alice@example.com",
      password: SECRET_PASSWORD,
      url: "https://mail.example.com",
    },
    notes: "recovery codes in the drawer",
    customFields: [
      { label: "Pet Name", value: "canary-custom-value", isHidden: true },
    ],
    totp: "JBSWY3DPEHPK3PXP",
  });
}

describe("条目服务: 搜索的结果", () => {
  const getHarness = useVaultServiceHarness();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("命中的条目返回编号与命中字段名", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(loginInput("Gmail"));
    entries.create(newEntryInputOf({ name: "Other" }));

    expect(entries.search("mail drawer")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: ["name", "url", "notes"] }],
    });
  });

  it("所有类型字段都按类型里的定义参与搜索, 保密字段除外", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        fields: Object.fromEntries(
          LOGIN_TYPE.fields.map((field) => [field.key, `${field.key}-token`]),
        ),
      }),
    );

    expect(entries.search("account-token")).toMatchObject({
      value: [{ id: "id-1" }],
    });
    expect(entries.search("url-token")).toMatchObject({
      value: [{ id: "id-1" }],
    });
    expect(entries.search("password-token")).toEqual({ ok: true, value: [] });
  });

  it("编辑后搜索结果立即一致, 删除后条目不再出现", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(loginInput("Gmail"));

    entries.update(
      "id-1",
      updateEntryInputOf({ name: "Renamed", notes: "changed" }),
    );

    expect(entries.search("gmail")).toEqual({ ok: true, value: [] });
    expect(entries.search("renamed")).toEqual({
      ok: true,
      value: [{ id: "id-1", fields: ["name"] }],
    });

    entries.remove("id-1");

    expect(entries.search("renamed")).toEqual({ ok: true, value: [] });
  });
});

describe("条目服务: 搜索不泄露保密值", () => {
  const getHarness = useVaultServiceHarness();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("结果与控制台输出里没有保密值", async () => {
    const logs = [
      vi.spyOn(console, "log"),
      vi.spyOn(console, "info"),
      vi.spyOn(console, "warn"),
      vi.spyOn(console, "error"),
    ];
    const { entries, failures } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(loginInput("Gmail"));

    const results = [
      entries.search("gmail"),
      entries.search(SECRET_PASSWORD),
      entries.search("canary-custom-value"),
      entries.search("jbswy3dpehpk3pxp"),
    ];

    expect(JSON.stringify(results).toLowerCase()).not.toContain("canary-");
    expect(JSON.stringify(results).toLowerCase()).not.toContain("jbswy3dp");
    expect(results.slice(1)).toEqual(Array(3).fill({ ok: true, value: [] }));
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
    expect(failures).toEqual([]);
  });
});

describe("条目服务: 搜索的失败", () => {
  const getHarness = useVaultServiceHarness();

  it("未解锁时返回失败结果", async () => {
    const vault = await startService(getHarness());
    const { entries } = createEntryServiceFixture(vault);

    expect(entries.search("anything")).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });

  it("读取意外失败时返回失败结果并通知回调", async () => {
    const vault = await startService(getHarness());
    const broken = {
      all: () => {
        throw new Error("boom");
      },
      select: () => {
        throw new Error("boom");
      },
    } as unknown as VaultOrm;
    const { entries, failures } = createEntryServiceFixture(
      vault,
      () => broken,
    );

    expect(entries.search("anything")).toEqual({
      ok: false,
      reason: "unexpected-error",
    });
    expect(failures).toHaveLength(1);
  });
});
