import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";

import {
  createEntryServiceFixture,
  createUnlockedEntryFixture,
  detailOf,
  emptyFieldValuesOf,
  newEntryInputOf,
  sampleFieldValuesOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";

describe("条目服务: 更新, 未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { entries } = createEntryServiceFixture(vault);

    expect(entries.update("id-1", updateEntryInputOf())).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});

describe("条目服务: 更新内容", () => {
  const getHarness = useVaultServiceHarness();

  it("名称, 类型字段, 备注与自定义字段都被换成新值, 编号与类型不变", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        name: "旧名称",
        fields: { account: "old", password: "old-p", url: "" },
        notes: "旧备注",
        customFields: [{ label: "旧", value: "旧值", isHidden: false }],
      }),
    );

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({
        name: "  新名称  ",
        fields: { account: "new", password: "new-p", url: "https://a.test" },
        notes: "第一行\n第二行",
        customFields: [
          { label: " 助记词 ", value: "a b\nc", isHidden: true },
          { label: "编号", value: "", isHidden: false },
        ],
      }),
    );

    const expected = detailOf({
      name: "新名称",
      account: "new",
      fields: { account: "new", password: "new-p", url: "https://a.test" },
      notes: "第一行\n第二行",
      customFields: [
        { id: "id-3", label: "助记词", value: "a b\nc", isHidden: true },
        { id: "id-4", label: "编号", value: "", isHidden: false },
      ],
    });
    expect(updated).toEqual({ ok: true, value: expected });
    expect(entries.get("id-1")).toEqual({ ok: true, value: expected });
  });
});

describe("条目服务: 更新后的列表", () => {
  const getHarness = useVaultServiceHarness();

  it("列表里条目的位置不变, 摘要换成新名称与新账号", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf({ name: "甲" }));
    entries.create(newEntryInputOf({ name: "乙" }));

    entries.update(
      "id-1",
      updateEntryInputOf({
        name: "甲改",
        fields: { account: "who", password: "", url: "" },
      }),
    );

    expect(entries.list()).toEqual({
      ok: true,
      value: [
        { id: "id-2", name: "乙", type: "login", account: "" },
        { id: "id-1", name: "甲改", type: "login", account: "who" },
      ],
    });
  });
});

describe("条目服务: 更新内容的边界", () => {
  const getHarness = useVaultServiceHarness();

  it("可以把备注与自定义字段清空", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        notes: "备注",
        customFields: [{ label: "字段", value: "值", isHidden: false }],
      }),
    );

    const updated = entries.update("id-1", updateEntryInputOf());

    expect(updated).toEqual({ ok: true, value: detailOf() });
  });

  it("类型之外的字段键不会存下来", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf());

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({
        fields: { account: "a", password: "", url: "", cardNumber: "6222" },
      }),
    );

    expect(updated.ok && Object.keys(updated.value.fields)).toEqual([
      "account",
      "password",
      "url",
    ]);
  });

  it.each(PRESET_ENTRY_TYPES)("$key 的每个字段都能改成新值", async (type) => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({ type: type.key, fields: emptyFieldValuesOf(type) }),
    );
    const fields = sampleFieldValuesOf(type);

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({ fields, name: "改过" }),
    );

    expect(updated).toEqual({
      ok: true,
      value: detailOf({
        type: type.key,
        name: "改过",
        fields,
        account: fields["account"] ?? "",
      }),
    });
  });
});

describe("条目服务: 更新后复制", () => {
  const getHarness = useVaultServiceHarness();

  it("复制账号, 密码, 备注与自定义字段得到的是更新后的值, 旧值不再能复制", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        fields: { account: "old", password: "old-p", url: "" },
        notes: "旧备注",
        customFields: [{ label: "旧", value: "旧值", isHidden: true }],
      }),
    );

    entries.update(
      "id-1",
      updateEntryInputOf({
        fields: { account: "new", password: "new-p", url: "" },
        notes: "新备注",
        customFields: [{ label: "新", value: "新值", isHidden: true }],
      }),
    );
    entries.copyField("id-1", "account");
    entries.copyField("id-1", "password");
    entries.copyField("id-1", "notes");
    const staleCopy = entries.copyCustomField("id-1", "id-2");
    const freshCopy = entries.copyCustomField("id-1", "id-3");

    expect(writeText.mock.calls.map(([text]) => text)).toEqual([
      "new",
      "new-p",
      "新备注",
      "新值",
    ]);
    expect(staleCopy).toEqual({ ok: false, reason: "not-found" });
    expect(freshCopy).toEqual({ ok: true, value: undefined });
  });
});

describe("条目服务: 更新的失败情形", () => {
  const getHarness = useVaultServiceHarness();

  it("没有这个编号时返回未找到", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    expect(entries.update("missing", updateEntryInputOf())).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("名称为空或超长, 字段缺失或超长, 自定义字段名为空时被拒绝且条目不变", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf({ name: "原名" }));
    const invalid = { ok: false, reason: "invalid-input" };

    const results = [
      entries.update("id-1", updateEntryInputOf({ name: "  " })),
      entries.update("id-1", updateEntryInputOf({ name: "n".repeat(101) })),
      entries.update("id-1", updateEntryInputOf({ fields: {} })),
      entries.update(
        "id-1",
        updateEntryInputOf({
          fields: { account: "a".repeat(201), password: "", url: "" },
        }),
      ),
      entries.update(
        "id-1",
        updateEntryInputOf({
          customFields: [{ label: " ", value: "v", isHidden: false }],
        }),
      ),
    ];

    for (const result of results) {
      expect(result).toEqual(invalid);
    }
    expect(entries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ name: "原名" }),
    });
  });
});
