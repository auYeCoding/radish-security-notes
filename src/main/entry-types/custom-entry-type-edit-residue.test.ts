import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toCustomTypeKey } from "@shared/entries/custom-types/custom-entry-type-key";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

import { decryptDatabasePages } from "../testing/decrypt-database-pages";
import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { entries } from "../vault/database/entry-schema";
import {
  openVaultDatabase,
  type VaultDatabase,
} from "../vault/database/open-vault-database";
import { CustomEntryTypeService } from "./custom-entry-type-service";

/**
 * 随机十六进制文本的字节数.
 */
const MARKER_RANDOM_BYTES = 16;

/**
 * 标记文本重复的次数, 让取值跨过多个数据库页, 覆盖溢出页的清除.
 */
const MARKER_REPEAT_COUNT = 400;

/**
 * 生成一个带随机后缀的标记文本.
 * @param prefix 标记前缀.
 * @returns 标记文本.
 */
function createMarker(prefix: string): string {
  return `${prefix}-${randomBytes(MARKER_RANDOM_BYTES).toString("hex")}`;
}

/**
 * 一次残留检查用的数据库, 类型服务与条目写入共用同一个连接.
 */
interface ResidueEnvironment {
  /**
   * 已迁移的加密数据库.
   */
  readonly database: VaultDatabase;
  /**
   * 数据库文件路径.
   */
  readonly databaseFile: string;
  /**
   * 数据密钥.
   */
  readonly dataKey: Buffer;
  /**
   * 类型服务.
   */
  readonly service: CustomEntryTypeService;
}

/**
 * 在临时目录里打开加密数据库并建好类型服务, 编号依次为 type-1, type-2.
 * @param directory 临时目录.
 * @returns 残留检查环境.
 */
function openEnvironment(directory: string): ResidueEnvironment {
  const dataKey = randomBytes(32);
  const databaseFile = join(directory, "vault.db");
  const database = openVaultDatabase({
    databaseFile,
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  });
  let counter = 0;
  const service = new CustomEntryTypeService({
    getOrm: () => database.orm,
    createIdentifier: () => `type-${(counter += 1)}`,
    now: () => 1,
    onFailure: () => undefined,
  });
  return { database, databaseFile, dataKey, service };
}

/**
 * 新建一个有摘要, 保密, 说明三个字段的类型.
 * @param service 类型服务.
 * @param name 类型名称.
 * @returns 新建的类型.
 */
function createResidueType(
  service: CustomEntryTypeService,
  name: string,
): CustomEntryType {
  const result = service.create({
    name,
    fields: [
      { name: "摘要", kind: "singleLine", isSensitive: false, isSummary: true },
      { name: "机密", kind: "singleLine", isSensitive: true, isSummary: false },
      { name: "说明", kind: "multiLine", isSensitive: false, isSummary: false },
    ],
  });
  if (!result.ok) {
    throw new Error("类型应能新建");
  }
  return result.value;
}

/**
 * 往条目表写入一个该类型的条目, 机密字段与说明字段的取值是标记文本的多次重复.
 * @param database 已迁移的数据库.
 * @param type 条目的类型.
 * @param secret 机密字段里的标记文本.
 * @param kept 说明字段里的标记文本.
 */
function insertTypedEntry(
  database: VaultDatabase,
  type: CustomEntryType,
  secret: string,
  kept: string,
): void {
  const [summary, secretField, noteField] = type.fields;
  database.orm
    .insert(entries)
    .values({
      id: "entry-1",
      name: "条目",
      type: toCustomTypeKey(type.id),
      fields: {
        [summary.key]: "摘要值",
        [secretField.key]: secret.repeat(MARKER_REPEAT_COUNT),
        [noteField.key]: kept.repeat(MARKER_REPEAT_COUNT),
      },
      createdAt: 1,
    })
    .run();
}

describe("删除字段后的残留", () => {
  const getDirectory = useTemporaryDirectory("custom-type-edit-residue");

  it("删除字段后, 被删字段的取值不残留在数据库页里, 保留字段的取值仍在", () => {
    const environment = openEnvironment(getDirectory());
    const type = createResidueType(environment.service, "残留类型");
    const secret = createMarker("deleted-field-value");
    const kept = createMarker("kept-field-value");
    insertTypedEntry(environment.database, type, secret, kept);
    const [summary, , note] = type.fields;

    const result = environment.service.update({
      id: type.id,
      name: "残留类型",
      fields: [
        { ...summary, isSummary: true },
        { ...note, isSummary: false },
      ],
      isImpactConfirmed: true,
    });
    environment.database.close();
    const pages = decryptDatabasePages(
      environment.databaseFile,
      environment.dataKey,
    );

    expect(result.ok).toBe(true);
    expect(pages.includes(kept)).toBe(true);
    expect(pages.includes(secret)).toBe(false);
  });
});

describe("换摘要字段后的残留", () => {
  const getDirectory = useTemporaryDirectory("custom-type-edit-residue-swap");

  it("换摘要字段后, 旧键下的取值不残留", () => {
    const environment = openEnvironment(getDirectory());
    const type = createResidueType(environment.service, "残留类型");
    const secret = createMarker("secret-value");
    const kept = createMarker("kept-value");
    insertTypedEntry(environment.database, type, secret, kept);
    const [summary, secretField, note] = type.fields;

    const swapResult = environment.service.update({
      id: type.id,
      name: "残留类型",
      fields: [
        { ...summary, isSummary: false },
        { ...secretField, isSummary: false },
        { ...note, kind: "singleLine", isSummary: true },
      ],
      isImpactConfirmed: true,
    });
    environment.database.close();
    const pages = decryptDatabasePages(
      environment.databaseFile,
      environment.dataKey,
    );

    expect(swapResult.ok).toBe(true);
    expect(pages.includes('"account":"摘要值"')).toBe(false);
    expect(pages.includes(`"account":"${kept}`)).toBe(true);
  });
});

describe("删除类型后的残留", () => {
  const getDirectory = useTemporaryDirectory("custom-type-edit-residue-remove");

  it("删除类型后, 类型名称, 旧类型键与旧字段键不残留, 条目取值只在转出的自定义字段里", () => {
    const environment = openEnvironment(getDirectory());
    const typeName = createMarker("deleted-type-name");
    const type = createResidueType(environment.service, typeName);
    const secret = createMarker("secret-value");
    const kept = createMarker("kept-value");
    insertTypedEntry(environment.database, type, secret, kept);
    const secretKey = type.fields[1].key;

    const result = environment.service.remove({
      id: type.id,
      isImpactConfirmed: true,
    });
    environment.database.close();
    const pages = decryptDatabasePages(
      environment.databaseFile,
      environment.dataKey,
    );

    expect(result.ok).toBe(true);
    expect(pages.includes(typeName)).toBe(false);
    expect(pages.includes(toCustomTypeKey(type.id))).toBe(false);
    expect(pages.includes(secretKey)).toBe(false);
    expect(pages.includes(`"account":"摘要值"`)).toBe(false);
    expect(pages.includes(`"value":"${secret}`)).toBe(true);
  });
});
