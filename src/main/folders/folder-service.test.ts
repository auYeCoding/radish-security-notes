import { describe, expect, it } from "vitest";

import { FOLDER_NAME_MAX_LENGTH } from "@shared/folders/folder-name-schema";

import {
  createFolderServiceFixture,
  createUnlockedFolderFixture,
} from "../testing/folder-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

describe("文件夹服务: 未解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("全部方法都因保险库未解锁而失败", async () => {
    const vault = await startService(getHarness());
    const { folders } = createFolderServiceFixture(vault);
    const locked = { ok: false, reason: "vault-locked" };

    expect(folders.list()).toEqual(locked);
    expect(folders.create("甲")).toEqual(locked);
    expect(folders.rename("folder-1", "乙")).toEqual(locked);
    expect(folders.remove("folder-1")).toEqual(locked);
    expect(folders.assignEntry("id-1", undefined)).toEqual(locked);
  });
});

describe("文件夹服务: 列出与新建", () => {
  const getHarness = useVaultServiceHarness();

  it("新建的文件夹按创建先后排列, 新的在末尾, 名称去首尾空格", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());

    const first = folders.create("  工作  ");
    const second = folders.create("家庭");

    expect(first).toEqual({
      ok: true,
      value: { id: "folder-1", name: "工作" },
    });
    expect(second).toEqual({
      ok: true,
      value: { id: "folder-2", name: "家庭" },
    });
    expect(folders.list()).toEqual({
      ok: true,
      value: [
        { id: "folder-1", name: "工作" },
        { id: "folder-2", name: "家庭" },
      ],
    });
  });

  it("没有文件夹时列表为空", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());

    expect(folders.list()).toEqual({ ok: true, value: [] });
  });
});

describe("文件夹服务: 新建的校验", () => {
  const getHarness = useVaultServiceHarness();

  it("名称为空或只有空白时不通过, 且不写入", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());

    expect(folders.create("")).toEqual({ ok: false, reason: "invalid-input" });
    expect(folders.create("   ")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(folders.list()).toEqual({ ok: true, value: [] });
  });

  it("名称恰好 50 个字符时通过, 按字符而不是按 UTF-16 单元计数, 超过时不通过", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());

    const boundary = folders.create("😀".repeat(FOLDER_NAME_MAX_LENGTH));
    const tooLong = folders.create("a".repeat(FOLDER_NAME_MAX_LENGTH + 1));

    expect(boundary.ok).toBe(true);
    expect(tooLong).toEqual({ ok: false, reason: "invalid-input" });
  });

  it("与已有文件夹同名时拒绝, 忽略英文大小写与首尾空格", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());
    folders.create("Work");

    expect(folders.create("work")).toEqual({ ok: false, reason: "name-taken" });
    expect(folders.create("  WORK ")).toEqual({
      ok: false,
      reason: "name-taken",
    });
    expect(folders.create("Works").ok).toBe(true);
  });

  it("只有非英文字母的大小写不同时不算重名", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());
    folders.create("École");

    expect(folders.create("école").ok).toBe(true);
    expect(folders.create("  ÉCOLE ")).toEqual({
      ok: false,
      reason: "name-taken",
    });
  });
});

describe("文件夹服务: 重命名", () => {
  const getHarness = useVaultServiceHarness();

  it("改名后列表里是新名称, 位置不变", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());
    folders.create("甲");
    folders.create("乙");

    const renamed = folders.rename("folder-1", " 丙 ");

    expect(renamed).toEqual({
      ok: true,
      value: { id: "folder-1", name: "丙" },
    });
    expect(folders.list()).toEqual({
      ok: true,
      value: [
        { id: "folder-1", name: "丙" },
        { id: "folder-2", name: "乙" },
      ],
    });
  });

  it("只改自己的大小写不算重名, 改成别的文件夹的名称才算", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());
    folders.create("work");
    folders.create("home");

    expect(folders.rename("folder-1", "Work").ok).toBe(true);
    expect(folders.rename("folder-1", "HOME")).toEqual({
      ok: false,
      reason: "name-taken",
    });
  });

  it("名称不合规时不改, 没有这个编号时为未找到", async () => {
    const { folders } = await createUnlockedFolderFixture(getHarness());
    folders.create("甲");

    expect(folders.rename("folder-1", "  ")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(folders.rename("missing", "乙")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(folders.list()).toEqual({
      ok: true,
      value: [{ id: "folder-1", name: "甲" }],
    });
  });
});

describe("文件夹服务: 意外错误", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库抛出错误时通知回调并返回意外错误", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const brokenOrm = {
      select: () => {
        throw new Error("boom");
      },
    } as unknown as VaultOrm;
    const { folders, failures } = createFolderServiceFixture(
      vault,
      () => brokenOrm,
    );

    const result = folders.list();

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(failures).toHaveLength(1);
  });
});
