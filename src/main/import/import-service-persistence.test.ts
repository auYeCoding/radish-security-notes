import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { listFolders } from "../folders/folder-repository";
import { findEntry, listEntrySummaries } from "../entries/entry-repository";
import {
  bitwardenCard,
  bitwardenExport,
  bitwardenLogin,
  bitwardenNote,
} from "../testing/bitwarden-sample";
import { decryptDatabasePages } from "../testing/decrypt-database-pages";
import {
  createImportServiceFixture,
  SAMPLE_SOURCE_PATH,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  openVaultDatabase,
  type VaultDatabase,
} from "../vault/database/open-vault-database";

/**
 * 样例导出: 一个登录 (在文件夹里, 带 TOTP 与自定义字段), 一个安全笔记, 一张卡.
 */
const SAMPLE_EXPORT = bitwardenExport([
  bitwardenLogin(),
  bitwardenNote(),
  bitwardenCard(),
]);

/**
 * 一次导入用的加密数据库与导入服务环境.
 */
interface PersistenceEnvironment {
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
   * 导入服务环境.
   */
  readonly fixture: ImportServiceFixture;
}

/**
 * 在临时目录里打开加密数据库并建好导入服务环境.
 * @param directory 临时目录.
 * @returns 持久化检查环境.
 */
function openEnvironment(directory: string): PersistenceEnvironment {
  const dataKey = randomBytes(32);
  const databaseFile = join(directory, "vault.db");
  const database = openVaultDatabase({
    databaseFile,
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  });
  const fixture = createImportServiceFixture(() => database.orm);
  fixture.state.files.set(
    SAMPLE_SOURCE_PATH,
    Buffer.from(SAMPLE_EXPORT, "utf8"),
  );
  return { database, databaseFile, dataKey, fixture };
}

/**
 * 选择样例文件并确认导入.
 * @param environment 持久化检查环境.
 * @returns 选择与确认完成后兑现.
 */
async function importSample(
  environment: PersistenceEnvironment,
): Promise<void> {
  await environment.fixture.service.chooseFile("bitwardenJson");
  environment.fixture.service.run({ duplicatePolicy: "skip" });
}

describe("导入服务: 持久化", () => {
  const getDirectory = useTemporaryDirectory("import-service-persistence");

  it("关闭重开后导入的条目, 文件夹与字段仍在", async () => {
    const directory = getDirectory();
    const first = openEnvironment(directory);
    await importSample(first);
    first.database.close();

    const reopened = openVaultDatabase({
      databaseFile: first.databaseFile,
      dataKey: first.dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const names = listEntrySummaries(reopened.orm).map((entry) => entry.name);
    const login = listEntrySummaries(reopened.orm).find(
      (entry) => entry.name === "Example Site",
    );
    const record = findEntry(reopened.orm, login?.id ?? "");
    reopened.close();

    expect(names.sort()).toEqual([
      "Example Card",
      "Example Note",
      "Example Site",
    ]);
    expect(record?.fields.password).toBe("FakePassw0rd!");
    expect(record?.totp).not.toBeNull();
    expect(record?.customFields).toHaveLength(3);
  });

  it("重开后文件夹仍在", async () => {
    const first = openEnvironment(getDirectory());
    await importSample(first);
    first.database.close();

    const reopened = openVaultDatabase({
      databaseFile: first.databaseFile,
      dataKey: first.dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const folders = listFolders(reopened.orm).map((folder) => folder.name);
    reopened.close();

    expect(folders).toEqual(["Demo/Work"]);
  });
});

describe("导入服务: 数据库里没有来源文件的整段明文", () => {
  const getDirectory = useTemporaryDirectory("import-service-residue");

  it("导入的字段值在数据库页里, 来源文件的整段文本与整个文件都不在", async () => {
    const environment = openEnvironment(getDirectory());
    await importSample(environment);
    environment.database.close();
    const pages = decryptDatabasePages(
      environment.databaseFile,
      environment.dataKey,
    );

    expect(pages.includes("FakePassw0rd!")).toBe(true);
    expect(pages.includes(SAMPLE_EXPORT)).toBe(false);
    expect(pages.includes(SAMPLE_EXPORT.slice(0, 200))).toBe(false);
    expect(pages.includes('"encrypted":false')).toBe(false);
  });
});
