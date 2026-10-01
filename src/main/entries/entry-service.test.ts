import { describe, expect, it } from "vitest";

import {
  createEntryServiceFixture,
  createUnlockedEntryFixture,
  detailOf,
  newEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";

describe("条目服务: 未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("全部操作都因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { entries } = createEntryServiceFixture(vault);
    const locked = { ok: false, reason: "vault-locked" };

    expect(entries.list()).toEqual(locked);
    expect(entries.get("id-1")).toEqual(locked);
    expect(entries.create(newEntryInputOf())).toEqual(locked);
    expect(entries.copyField("id-1", "account")).toEqual(locked);
    expect(entries.copyCustomField("id-1", "id-2")).toEqual(locked);
  });
});

describe("条目服务: 新建与读取", () => {
  const getHarness = useVaultServiceHarness();

  it("新建的条目带编号, 出现在列表最前, 详情含密码", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    const first = entries.create(
      newEntryInputOf({ name: "论坛", account: "a1", password: "p1" }),
    );
    const second = entries.create(
      newEntryInputOf({ name: "银行", account: "a2", password: "p2" }),
    );

    expect(first).toEqual({
      ok: true,
      value: detailOf({ name: "论坛", account: "a1", password: "p1" }),
    });
    expect(entries.list()).toEqual({
      ok: true,
      value: [
        { id: "id-2", name: "银行", account: "a2" },
        { id: "id-1", name: "论坛", account: "a1" },
      ],
    });
    expect(second.ok && entries.get(second.value.id)).toEqual(second);
  });

  it("读取不存在的编号返回未找到", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    expect(entries.get("missing")).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("条目服务: 网址, 备注与自定义字段", () => {
  const getHarness = useVaultServiceHarness();

  it("保存网址, 多行备注与自定义字段, 字段编号接在条目编号之后依次分配", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    const input = newEntryInputOf({
      name: "钱包",
      url: "https://example.test/wallet",
      notes: "第一行\n第二行",
      customFields: [
        { label: "助记词", value: "a b c\nd e f", isHidden: true },
        { label: "编号", value: "", isHidden: false },
      ],
    });

    const created = entries.create(input);

    const expected = detailOf({
      name: "钱包",
      url: "https://example.test/wallet",
      notes: "第一行\n第二行",
      customFields: [
        { id: "id-2", label: "助记词", value: "a b c\nd e f", isHidden: true },
        { id: "id-3", label: "编号", value: "", isHidden: false },
      ],
    });
    expect(created).toEqual({ ok: true, value: expected });
    expect(entries.get("id-1")).toEqual({ ok: true, value: expected });
  });
});

describe("条目服务: 名称校验", () => {
  const getHarness = useVaultServiceHarness();

  it("名称去首尾空格, 账号与密码可以为空", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    const result = entries.create(newEntryInputOf({ name: "  名称  " }));

    expect(result).toEqual({ ok: true, value: detailOf({ name: "名称" }) });
  });

  it("名称为空或超长时被拒绝且不写入", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    const empty = entries.create(newEntryInputOf({ name: "  " }));
    const tooLong = entries.create(newEntryInputOf({ name: "n".repeat(101) }));

    expect(empty).toEqual({ ok: false, reason: "invalid-input" });
    expect(tooLong).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });
});

describe("条目服务: 自定义字段名校验", () => {
  const getHarness = useVaultServiceHarness();

  it("字段名去首尾空格, 为空时整条被拒绝且不写入", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    const trimmed = entries.create(
      newEntryInputOf({
        customFields: [{ label: "  标签  ", value: " v ", isHidden: false }],
      }),
    );
    const emptyLabel = entries.create(
      newEntryInputOf({
        customFields: [{ label: "  ", value: "v", isHidden: false }],
      }),
    );

    expect(trimmed).toMatchObject({
      ok: true,
      value: { customFields: [{ label: "标签", value: " v " }] },
    });
    expect(emptyLabel).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.list()).toMatchObject({ value: [{ id: "id-1" }] });
  });
});

describe("条目服务: 不限制长度与数量", () => {
  const getHarness = useVaultServiceHarness();

  it("网址, 备注与自定义字段都不限制长度与数量", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    const customFields = Array.from({ length: 200 }, (_, index) => ({
      label: `字段 ${index}`,
      value: "v".repeat(5000),
      isHidden: false,
    }));

    const result = entries.create(
      newEntryInputOf({
        url: `https://example.test/${"p".repeat(10000)}`,
        notes: "n".repeat(100000),
        customFields,
      }),
    );

    expect(result.ok && result.value.customFields).toHaveLength(200);
    expect(result.ok && result.value.notes).toHaveLength(100000);
  });
});
