import { describe, expect, it } from "vitest";

import { TAG_NAME_MAX_LENGTH } from "@shared/tags/tag-name-schema";

import {
  createTagServiceFixture,
  createUnlockedTagFixture,
} from "../testing/tag-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

describe("标签服务: 未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("全部方法都因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { tags } = createTagServiceFixture(vault);
    const locked = { ok: false, reason: "vault-locked" };

    expect(tags.list()).toEqual(locked);
    expect(tags.create("甲", "red")).toEqual(locked);
    expect(tags.update("tag-1", "乙", "blue")).toEqual(locked);
    expect(tags.remove("tag-1")).toEqual(locked);
  });
});

describe("标签服务: 列出与新建", () => {
  const getHarness = useVaultServiceHarness();

  it("新建的标签按创建先后排列, 新的在末尾, 名称去首尾空格, 颜色原样保存", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());

    const first = tags.create("  工作  ", "red");
    const second = tags.create("家庭", "slate");

    expect(first).toEqual({
      ok: true,
      value: { id: "tag-1", name: "工作", color: "red" },
    });
    expect(second).toEqual({
      ok: true,
      value: { id: "tag-2", name: "家庭", color: "slate" },
    });
    expect(tags.list()).toEqual({
      ok: true,
      value: [
        { id: "tag-1", name: "工作", color: "red" },
        { id: "tag-2", name: "家庭", color: "slate" },
      ],
    });
  });

  it("没有标签时列表为空", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());

    expect(tags.list()).toEqual({ ok: true, value: [] });
  });
});

describe("标签服务: 新建的校验", () => {
  const getHarness = useVaultServiceHarness();

  it("名称为空或只有空白时不通过, 且不写入", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());

    expect(tags.create("", "red")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(tags.create("   ", "red")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(tags.list()).toEqual({ ok: true, value: [] });
  });

  it("名称恰好 50 个字符时通过, 按字符而不是按 UTF-16 单元计数, 超过时不通过", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());

    const boundary = tags.create("😀".repeat(TAG_NAME_MAX_LENGTH), "red");
    const tooLong = tags.create("a".repeat(TAG_NAME_MAX_LENGTH + 1), "red");

    expect(boundary.ok).toBe(true);
    expect(tooLong).toEqual({ ok: false, reason: "invalid-input" });
  });

  it("颜色不在调色板里时不通过", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());

    expect(tags.create("工作", "teal")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(tags.list()).toEqual({ ok: true, value: [] });
  });
});

describe("标签服务: 新建时的重名校验", () => {
  const getHarness = useVaultServiceHarness();

  it("与已有标签同名时拒绝, 忽略英文大小写与首尾空格", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());
    tags.create("Work", "red");

    expect(tags.create("work", "blue")).toEqual({
      ok: false,
      reason: "name-taken",
    });
    expect(tags.create("  WORK ", "blue")).toEqual({
      ok: false,
      reason: "name-taken",
    });
    expect(tags.create("Works", "blue").ok).toBe(true);
  });

  it("只有非英文字母的大小写不同时不算重名", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());
    tags.create("École", "red");

    expect(tags.create("école", "red").ok).toBe(true);
    expect(tags.create("  ÉCOLE ", "red")).toEqual({
      ok: false,
      reason: "name-taken",
    });
  });
});

describe("标签服务: 编辑", () => {
  const getHarness = useVaultServiceHarness();

  it("改名改色后列表里是新值, 位置不变", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());
    tags.create("甲", "red");
    tags.create("乙", "blue");

    const updated = tags.update("tag-1", " 丙 ", "green");

    expect(updated).toEqual({
      ok: true,
      value: { id: "tag-1", name: "丙", color: "green" },
    });
    expect(tags.list()).toEqual({
      ok: true,
      value: [
        { id: "tag-1", name: "丙", color: "green" },
        { id: "tag-2", name: "乙", color: "blue" },
      ],
    });
  });

  it("只改颜色, 名称不变时通过, 只改自己的大小写不算重名, 改成别的标签的名称才算", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());
    tags.create("work", "red");
    tags.create("home", "blue");

    expect(tags.update("tag-1", "work", "pink").ok).toBe(true);
    expect(tags.update("tag-1", "Work", "pink").ok).toBe(true);
    expect(tags.update("tag-1", "HOME", "pink")).toEqual({
      ok: false,
      reason: "name-taken",
    });
  });
});

describe("标签服务: 编辑的校验", () => {
  const getHarness = useVaultServiceHarness();

  it("输入不合规时不改, 没有这个编号时为未找到", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());
    tags.create("甲", "red");

    expect(tags.update("tag-1", "  ", "red")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(tags.update("tag-1", "乙", "teal")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(tags.update("missing", "乙", "red")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(tags.list()).toEqual({
      ok: true,
      value: [{ id: "tag-1", name: "甲", color: "red" }],
    });
  });
});

describe("标签服务: 删除", () => {
  const getHarness = useVaultServiceHarness();

  it("删除后标签不在列表里, 再删或没有这个编号时为未找到", async () => {
    const { tags } = await createUnlockedTagFixture(getHarness());
    tags.create("甲", "red");
    tags.create("乙", "blue");

    expect(tags.remove("tag-1")).toEqual({ ok: true, value: undefined });
    expect(tags.remove("tag-1")).toEqual({ ok: false, reason: "not-found" });
    expect(tags.list()).toEqual({
      ok: true,
      value: [{ id: "tag-2", name: "乙", color: "blue" }],
    });
  });
});

describe("标签服务: 意外错误", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库抛出错误时通知回调并返回意外错误", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const brokenOrm = {
      select: () => {
        throw new Error("boom");
      },
    } as unknown as VaultOrm;
    const { tags, failures } = createTagServiceFixture(vault, () => brokenOrm);

    const result = tags.list();

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(failures).toHaveLength(1);
  });
});
