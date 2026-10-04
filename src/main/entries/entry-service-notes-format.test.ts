import { describe, expect, it } from "vitest";

import {
  createEntryServiceFixture,
  createUnlockedEntryFixture,
  detailOf,
  newEntryInputOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 一段带标题, 列表与链接的 Markdown 备注原文.
 */
const MARKDOWN_NOTES = "# 标题\n\n- 甲\n- 乙\n\n[链接](https://example.test)";

/**
 * 把输入的备注格式换成共享层没有定义的取值, 类型上仍当作原输入, 模拟越过类型检查的调用.
 * @param input 新建或更新输入.
 * @returns 备注格式是未知取值的输入.
 */
function withUnknownFormat<Input extends object>(input: Input): Input {
  return { ...input, notesFormat: "html" };
}

describe("条目服务: 备注格式的新建与读取", () => {
  const getHarness = useVaultServiceHarness();

  it("新建时带 Markdown 格式, 返回值与读取的详情都是 Markdown, 备注原文不变", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    const created = entries.create(
      newEntryInputOf({ notes: MARKDOWN_NOTES, notesFormat: "markdown" }),
    );

    const expected = detailOf({
      notes: MARKDOWN_NOTES,
      notesFormat: "markdown",
    });
    expect(created).toEqual({ ok: true, value: expected });
    expect(entries.get("id-1")).toEqual({ ok: true, value: expected });
  });

  it("新建时带纯文本格式, 详情是纯文本", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    entries.create(newEntryInputOf({ notes: "第一行\n第二行" }));

    expect(entries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ notes: "第一行\n第二行", notesFormat: "plain" }),
    });
  });

  it("格式不在共享层取值里时新建被拒绝, 不写入条目", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());

    const result = entries.create(withUnknownFormat(newEntryInputOf()));

    expect(result).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });
});

describe("条目服务: 备注格式的更新", () => {
  const getHarness = useVaultServiceHarness();

  it("更新可以把纯文本改成 Markdown, 再改回纯文本, 备注原文随之保存", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf({ notes: "旧备注" }));

    const toMarkdown = entries.update(
      "id-1",
      updateEntryInputOf({ notes: MARKDOWN_NOTES, notesFormat: "markdown" }),
    );
    const toPlain = entries.update(
      "id-1",
      updateEntryInputOf({ notes: MARKDOWN_NOTES, notesFormat: "plain" }),
    );

    expect(toMarkdown).toEqual({
      ok: true,
      value: detailOf({ notes: MARKDOWN_NOTES, notesFormat: "markdown" }),
    });
    expect(toPlain).toEqual({
      ok: true,
      value: detailOf({ notes: MARKDOWN_NOTES, notesFormat: "plain" }),
    });
    expect(entries.get("id-1")).toEqual(toPlain);
  });

  it("更新时格式不在共享层取值里被拒绝, 条目保持原格式", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(newEntryInputOf({ notesFormat: "markdown" }));

    const result = entries.update(
      "id-1",
      withUnknownFormat(updateEntryInputOf()),
    );

    expect(result).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ notesFormat: "markdown" }),
    });
  });
});

describe("条目服务: 备注格式与复制, 搜索", () => {
  const getHarness = useVaultServiceHarness();

  it("复制备注复制的是原文, 不论格式", async () => {
    const { entries, writeText } =
      await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({ notes: MARKDOWN_NOTES, notesFormat: "markdown" }),
    );

    const result = entries.copyField("id-1", "notes");

    expect(result).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenCalledWith(MARKDOWN_NOTES);
  });

  it("搜索匹配 Markdown 备注的源文本, 包含标记符号", async () => {
    const { entries } = await createUnlockedEntryFixture(getHarness());
    entries.create(
      newEntryInputOf({ notes: "**独特词**", notesFormat: "markdown" }),
    );

    const byWord = entries.search("独特词");
    const bySymbols = entries.search("**独特");

    expect(byWord).toMatchObject({ ok: true, value: [{ id: "id-1" }] });
    expect(bySymbols).toMatchObject({ ok: true, value: [{ id: "id-1" }] });
  });
});

describe("条目服务: 备注格式的持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("关闭重开并解锁后, 两个条目的格式与备注原文都在", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries } = createEntryServiceFixture(vault);
    entries.create(
      newEntryInputOf({ notes: MARKDOWN_NOTES, notesFormat: "markdown" }),
    );
    entries.create(newEntryInputOf({ notes: MARKDOWN_NOTES }));
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    expect(reopenedEntries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ notes: MARKDOWN_NOTES, notesFormat: "markdown" }),
    });
    expect(reopenedEntries.get("id-2")).toEqual({
      ok: true,
      value: detailOf({
        id: "id-2",
        notes: MARKDOWN_NOTES,
        notesFormat: "plain",
      }),
    });
  });
});
