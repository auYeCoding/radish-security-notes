import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { generateDataKey } from "./data-key";
import { KeyFileStore } from "./key-file-store";
import { KeyProtectionWriter } from "./key-protection-writer";
import {
  MASTER_PASSWORD_PROTECTION,
  SYSTEM_PROTECTION,
  type MasterPasswordKeyRecord,
  type SystemKeyRecord,
} from "./key-record";
import { unprotectWithMasterPassword } from "./master-password-key-protector";
import type { SafeStoragePort } from "./safe-storage-port";
import { unprotectWithSystem } from "./system-key-protector";
import { resolveVaultPaths } from "./vault-paths";

/**
 * 创建写入器时可调整的依赖.
 */
interface WriterOptions {
  /**
   * 替换默认的假 safeStorage.
   */
  readonly safeStorage?: SafeStoragePort;
  /**
   * 系统密钥是否已落盘, 默认已落盘.
   */
  readonly isPersisted?: boolean;
}

/**
 * 测试用的写入器与它写入的密钥文件存储.
 */
interface WriterFixture {
  /**
   * 被测的写入器.
   */
  readonly writer: KeyProtectionWriter;
  /**
   * 写入器写入的密钥文件存储.
   */
  readonly keyFileStore: KeyFileStore;
}

/**
 * 在给定目录下创建写入器与它的密钥文件存储.
 * @param directory 用户数据目录.
 * @param options 可调整的依赖.
 * @returns 写入器与密钥文件存储.
 */
function createWriterFixture(
  directory: string,
  options: WriterOptions = {},
): WriterFixture {
  const keyFileStore = new KeyFileStore(resolveVaultPaths(directory));
  const writer = new KeyProtectionWriter({
    keyFileStore,
    safeStorage: options.safeStorage ?? createFakeSafeStorage(),
    systemKeyPersistence: {
      waitUntilPersisted: () => Promise.resolve(options.isPersisted ?? true),
    },
    argon2Parameters: FAST_ARGON2_PARAMETERS,
  });
  return { writer, keyFileStore };
}

describe("KeyProtectionWriter 主密码保护", () => {
  const getDirectory = useTemporaryDirectory("key-protection-writer");

  it("写入密钥文件, 主密码能解开同一个数据密钥", async () => {
    const { writer, keyFileStore } = createWriterFixture(getDirectory());
    const dataKey = generateDataKey();

    await writer.writeMasterPasswordProtection(dataKey, TEST_MASTER_PASSWORD);

    const record = await keyFileStore.read();
    expect(record?.protection).toBe(MASTER_PASSWORD_PROTECTION);
    const unwrapped = await unprotectWithMasterPassword(
      record as MasterPasswordKeyRecord,
      TEST_MASTER_PASSWORD,
    );
    expect(unwrapped.equals(dataKey)).toBe(true);
  });

  it("不改动调用方传入的数据密钥", async () => {
    const { writer } = createWriterFixture(getDirectory());
    const dataKey = generateDataKey();
    const snapshot = Buffer.from(dataKey);

    await writer.writeMasterPasswordProtection(dataKey, TEST_MASTER_PASSWORD);

    expect(dataKey.equals(snapshot)).toBe(true);
  });
});

describe("KeyProtectionWriter 系统保护", () => {
  const getDirectory = useTemporaryDirectory("key-protection-writer");

  it("写入密钥文件, 系统能解开同一个数据密钥", async () => {
    const safeStorage = createFakeSafeStorage();
    const { writer, keyFileStore } = createWriterFixture(getDirectory(), {
      safeStorage,
    });
    const dataKey = generateDataKey();

    const isWritten = await writer.writeSystemProtection(dataKey);

    expect(isWritten).toBe(true);
    const record = await keyFileStore.read();
    expect(record?.protection).toBe(SYSTEM_PROTECTION);
    const result = await unprotectWithSystem(
      record as SystemKeyRecord,
      safeStorage,
    );
    expect(result.dataKey.equals(dataKey)).toBe(true);
  });

  it("系统不能保护数据密钥时返回 false, 不写文件", async () => {
    const { writer, keyFileStore } = createWriterFixture(getDirectory(), {
      safeStorage: createFakeSafeStorage({ isAvailable: false }),
    });

    expect(await writer.writeSystemProtection(generateDataKey())).toBe(false);
    expect(await keyFileStore.read()).toBeUndefined();
  });

  it("系统密钥没有落盘时返回 false, 不写文件", async () => {
    const { writer, keyFileStore } = createWriterFixture(getDirectory(), {
      isPersisted: false,
    });

    expect(await writer.writeSystemProtection(generateDataKey())).toBe(false);
    expect(await keyFileStore.read()).toBeUndefined();
  });

  it("系统加密出现意外错误时向上抛出", async () => {
    const { writer } = createWriterFixture(getDirectory(), {
      safeStorage: {
        isAsyncEncryptionAvailable: () => Promise.resolve(true),
        encryptStringAsync: () => Promise.reject(new Error("加密失败")),
        decryptStringAsync: () => Promise.reject(new Error("不应被调用")),
      },
    });

    await expect(
      writer.writeSystemProtection(generateDataKey()),
    ).rejects.toThrow("加密失败");
  });
});
