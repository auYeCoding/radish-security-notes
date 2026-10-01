import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";

import {
  createUnlockedEntryFixture,
  newEntryInputOf,
  sampleFieldValuesOf,
} from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("条目服务: 逐个预设类型复制字段", () => {
  const getHarness = useVaultServiceHarness();

  it.each(PRESET_ENTRY_TYPES)(
    "$key 的每个字段都能复制, 剪贴板收到字段原值, 多行原样",
    async (type) => {
      const { entries, writeText } =
        await createUnlockedEntryFixture(getHarness());
      const fields = sampleFieldValuesOf(type);
      entries.create(newEntryInputOf({ type: type.key, fields }));

      const results = type.fields.map((field) =>
        entries.copyField("id-1", field.key),
      );

      expect(results).toEqual(
        type.fields.map(() => ({ ok: true, value: undefined })),
      );
      expect(writeText.mock.calls).toEqual(
        type.fields.map((field) => [fields[field.key]]),
      );
    },
  );
});

describe("条目服务: 复制备注", () => {
  const getHarness = useVaultServiceHarness();

  it("把多行备注原样写入剪贴板", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf({ notes: "第一行\n第二行 " }));

    const copied = entries.copyField("id-1", "notes");

    expect(copied).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenCalledWith("第一行\n第二行 ");
  });
});

describe("条目服务: 复制失败", () => {
  const getHarness = useVaultServiceHarness();

  it("编号不存在, 或字段名不属于条目的类型时不写剪贴板", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        fields: { account: "a", password: "p", url: "https://a.test" },
      }),
    );

    const missingEntry = entries.copyField("missing", "password");
    const otherTypeField = entries.copyField("id-1", "cardNumber");
    const unknownField = entries.copyField("id-1", "customFields");

    for (const result of [missingEntry, otherTypeField, unknownField]) {
      expect(result).toEqual({ ok: false, reason: "not-found" });
    }
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("条目服务: 复制自定义字段", () => {
  const getHarness = useVaultServiceHarness();

  it("按字段编号写入字段值, 多行原样, 隐藏字段同样可复制", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        customFields: [
          { label: "普通", value: "plain-value", isHidden: false },
          { label: "助记词", value: "a b c\nd e f", isHidden: true },
        ],
      }),
    );

    const plain = entries.copyCustomField("id-1", "id-2");
    const hidden = entries.copyCustomField("id-1", "id-3");

    expect(plain).toEqual({ ok: true, value: undefined });
    expect(hidden).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenNthCalledWith(1, "plain-value");
    expect(writeText).toHaveBeenNthCalledWith(2, "a b c\nd e f");
  });

  it("条目或字段编号不存在时不写剪贴板", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        customFields: [{ label: "标签", value: "v", isHidden: false }],
      }),
    );

    const missingEntry = entries.copyCustomField("missing", "id-2");
    const missingField = entries.copyCustomField("id-1", "missing");

    expect(missingEntry).toEqual({ ok: false, reason: "not-found" });
    expect(missingField).toEqual({ ok: false, reason: "not-found" });
    expect(writeText).not.toHaveBeenCalled();
  });
});
