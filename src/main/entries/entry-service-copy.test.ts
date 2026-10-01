import { describe, expect, it } from "vitest";

import {
  createUnlockedEntryFixture,
  newEntryInputOf,
} from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("条目服务: 复制账号与密码", () => {
  const getHarness = useVaultServiceHarness();

  it("把账号或密码写入剪贴板", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({ account: "the-account", password: "the-pw" }),
    );

    const copiedAccount = entries.copyField("id-1", "account");
    const copiedPassword = entries.copyField("id-1", "password");

    expect(copiedAccount).toEqual({ ok: true, value: undefined });
    expect(copiedPassword).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenNthCalledWith(1, "the-account");
    expect(writeText).toHaveBeenNthCalledWith(2, "the-pw");
  });

  it("编号不存在时不写剪贴板", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());

    const result = entries.copyField("missing", "password");

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("条目服务: 复制网址与备注", () => {
  const getHarness = useVaultServiceHarness();

  it("把网址与多行备注原样写入剪贴板", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({
        url: "https://example.test/a?b=c",
        notes: "第一行\n第二行 ",
      }),
    );

    const copiedUrl = entries.copyField("id-1", "url");
    const copiedNotes = entries.copyField("id-1", "notes");

    expect(copiedUrl).toEqual({ ok: true, value: undefined });
    expect(copiedNotes).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenNthCalledWith(1, "https://example.test/a?b=c");
    expect(writeText).toHaveBeenNthCalledWith(2, "第一行\n第二行 ");
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
