import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";

import {
  detailOf,
  newEntryInputOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import { createUnlockedTagAndEntryFixture } from "../testing/tag-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("条目服务: 新建时打标签", () => {
  const getHarness = useVaultServiceHarness();

  it("带标签新建后详情与列表里有标签编号, 顺序是选择顺序", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");
    tags.create("乙", "blue");

    const created = entries.create(
      newEntryInputOf({ tagIds: ["tag-2", "tag-1"] }),
    );

    expect(created).toEqual({
      ok: true,
      value: detailOf({ tagIds: ["tag-2", "tag-1"] }),
    });
    const listed = entries.list();
    expect(listed.ok && listed.value[0]?.tagIds).toEqual(["tag-2", "tag-1"]);
  });

  it("不带标签新建时详情与列表里都没有标签编号", async () => {
    const { entries } = await createUnlockedTagAndEntryFixture(getHarness());

    const created = entries.create(newEntryInputOf());

    expect(created.ok && created.value.tagIds).toBeUndefined();
    const listed = entries.list();
    expect(listed.ok && listed.value[0]?.tagIds).toBeUndefined();
  });
});

describe("条目服务: 新建时的标签校验", () => {
  const getHarness = useVaultServiceHarness();

  it("标签不存在时失败, 且不写入条目", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");

    const result = entries.create(
      newEntryInputOf({ tagIds: ["tag-1", "missing"] }),
    );

    expect(result).toEqual({ ok: false, reason: "tag-not-found" });
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });

  it("标签重复或超过上限时为输入不合规", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    const tagIds = Array.from(
      { length: MAX_TAGS_PER_ENTRY + 1 },
      (_, index) => {
        tags.create(`标签${index}`, "red");
        return `tag-${index + 1}`;
      },
    );

    expect(
      entries.create(newEntryInputOf({ tagIds: ["tag-1", "tag-1"] })),
    ).toEqual({ ok: false, reason: "invalid-input" });
    expect(entries.create(newEntryInputOf({ tagIds }))).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(
      entries.create(
        newEntryInputOf({ tagIds: tagIds.slice(0, MAX_TAGS_PER_ENTRY) }),
      ).ok,
    ).toBe(true);
  });
});

describe("条目服务: 编辑时改标签", () => {
  const getHarness = useVaultServiceHarness();

  it("更新后标签以输入为准, 增减与改顺序都生效", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");
    tags.create("乙", "blue");
    tags.create("丙", "green");
    entries.create(newEntryInputOf({ tagIds: ["tag-1", "tag-2"] }));

    const updated = entries.update(
      "id-1",
      updateEntryInputOf({ tagIds: ["tag-3", "tag-1"] }),
    );

    expect(updated.ok && updated.value.tagIds).toEqual(["tag-3", "tag-1"]);
    const fetched = entries.get("id-1");
    expect(fetched.ok && fetched.value.tagIds).toEqual(["tag-3", "tag-1"]);
  });

  it("更新时省略标签表示摘掉全部标签", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");
    entries.create(newEntryInputOf({ tagIds: ["tag-1"] }));

    const updated = entries.update("id-1", updateEntryInputOf());

    expect(updated.ok && updated.value.tagIds).toBeUndefined();
    expect(tags.list()).toEqual({
      ok: true,
      value: [{ id: "tag-1", name: "甲", color: "red" }],
    });
  });

  it("标签不存在时失败, 条目原有的标签不变", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");
    entries.create(newEntryInputOf({ name: "原名", tagIds: ["tag-1"] }));

    const result = entries.update(
      "id-1",
      updateEntryInputOf({ name: "新名", tagIds: ["missing"] }),
    );

    expect(result).toEqual({ ok: false, reason: "tag-not-found" });
    const fetched = entries.get("id-1");
    expect(fetched.ok && [fetched.value.name, fetched.value.tagIds]).toEqual([
      "原名",
      ["tag-1"],
    ]);
  });
});

describe("条目服务: 删除标签与条目后的关联", () => {
  const getHarness = useVaultServiceHarness();

  it("删除标签只摘掉条目上的它, 条目与别的标签保留", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");
    tags.create("乙", "blue");
    entries.create(newEntryInputOf({ name: "一", tagIds: ["tag-1", "tag-2"] }));
    entries.create(newEntryInputOf({ name: "二", tagIds: ["tag-1"] }));

    tags.remove("tag-1");

    const listed = entries.list();
    expect(
      listed.ok &&
        listed.value.map((entry) => [entry.name, entry.tagIds ?? "none"]),
    ).toEqual([
      ["二", "none"],
      ["一", ["tag-2"]],
    ]);
  });

  it("删除条目后标签保留, 条目的关联随之消失", async () => {
    const { tags, entries } =
      await createUnlockedTagAndEntryFixture(getHarness());
    tags.create("甲", "red");
    entries.create(newEntryInputOf({ tagIds: ["tag-1"] }));

    expect(entries.remove("id-1")).toEqual({ ok: true, value: undefined });

    expect(tags.list()).toEqual({
      ok: true,
      value: [{ id: "tag-1", name: "甲", color: "red" }],
    });
    entries.create(newEntryInputOf({ tagIds: ["tag-1"] }));
    const listed = entries.list();
    expect(listed.ok && listed.value).toHaveLength(1);
  });
});
