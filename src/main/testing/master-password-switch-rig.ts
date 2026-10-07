import { generateDataKey } from "../vault/data-key";
import { KeyProtectionWriter } from "../vault/key-protection-writer";
import { unprotectWithMasterPassword } from "../vault/master-password-key-protector";
import {
  MasterPasswordSwitch,
  type MasterPasswordSwitchKeyProtection,
} from "../vault/master-password-switch";
import { dataKeyToRecoveryWords } from "../vault/recovery-phrase";
import type { SafeStoragePort } from "../vault/safe-storage-port";
import type { SystemKeyPersistence } from "../vault/system-key-persistence";
import { unprotectWithSystem } from "../vault/system-key-protector";
import type { ProtectionMode } from "./recovery-vault-fixtures";
import type { VaultServiceHarness } from "./vault-service-harness";
import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "./vault-test-fixtures";

/**
 * 切换测试里把系统密钥视为已落盘的等待器.
 */
const ALWAYS_PERSISTED_SYSTEM_KEY: SystemKeyPersistence = {
  waitUntilPersisted: () => Promise.resolve(true),
};

/**
 * 创建切换测试装置的选项.
 */
export interface SwitchRigOptions {
  /**
   * 切换前密钥文件的保护方式.
   */
  readonly mode: ProtectionMode;
  /**
   * 保险库是否已解锁, 默认已解锁.
   */
  readonly isUnlocked?: boolean;
  /**
   * 切换时使用的 safeStorage, 默认是正常工作的假 safeStorage.
   */
  readonly safeStorage?: SafeStoragePort;
  /**
   * 切换时使用的系统密钥落盘等待器, 默认立即视为已落盘.
   */
  readonly systemKeyPersistence?: SystemKeyPersistence;
}

/**
 * 切换测试装置: 已按指定保护方式写好密钥文件, 以及用真实的密钥文件存储与写入器搭起的开关.
 */
export interface SwitchRig {
  /**
   * 被测的主密码开关.
   */
  readonly switcher: MasterPasswordSwitch;
  /**
   * 切换前后都读写同一个密钥文件的存储.
   */
  readonly keyFileStore: VaultServiceHarness["keyFileStore"];
  /**
   * 写进密钥文件的原始数据密钥, 测试里用它比对切换前后是否同一个.
   */
  readonly dataKey: Buffer;
  /**
   * 原始数据密钥编码出的恢复词.
   */
  readonly recoveryWords: readonly string[];
  /**
   * 开关经失败回调报告过的错误.
   */
  readonly failures: unknown[];
  /**
   * 写入器依次收到的数据密钥缓冲区, 保留引用以便检查是否被清零.
   */
  readonly receivedKeys: Buffer[];
}

/**
 * 判断缓冲区是否已全部清零.
 * @param buffer 要检查的缓冲区.
 * @returns 全为零返回 true.
 */
export function isZeroed(buffer: Buffer): boolean {
  return buffer.every((byte) => byte === 0);
}

/**
 * 用正常工作的写入器按指定保护方式写好密钥文件.
 * @param harness 测试环境.
 * @param mode 保护方式.
 * @param dataKey 要保护的数据密钥.
 * @returns 写入完成后兑现.
 */
async function seedKeyFile(
  harness: VaultServiceHarness,
  mode: ProtectionMode,
  dataKey: Buffer,
): Promise<void> {
  const writer = new KeyProtectionWriter({
    keyFileStore: harness.keyFileStore,
    safeStorage: createFakeSafeStorage(),
    systemKeyPersistence: ALWAYS_PERSISTED_SYSTEM_KEY,
    argon2Parameters: FAST_ARGON2_PARAMETERS,
  });
  if (mode === "master-password") {
    await writer.writeMasterPasswordProtection(dataKey, TEST_MASTER_PASSWORD);
    return;
  }
  await writer.writeSystemProtection(dataKey);
}

/**
 * 创建切换测试装置.
 * @param harness 测试环境.
 * @param options 保护方式与可覆盖的依赖.
 * @returns 测试装置.
 */
export async function createSwitchRig(
  harness: VaultServiceHarness,
  options: SwitchRigOptions,
): Promise<SwitchRig> {
  const dataKey = generateDataKey();
  await seedKeyFile(harness, options.mode, dataKey);
  const safeStorage = options.safeStorage ?? createFakeSafeStorage();
  const writer = new KeyProtectionWriter({
    keyFileStore: harness.keyFileStore,
    safeStorage,
    systemKeyPersistence:
      options.systemKeyPersistence ?? ALWAYS_PERSISTED_SYSTEM_KEY,
    argon2Parameters: FAST_ARGON2_PARAMETERS,
  });
  const receivedKeys: Buffer[] = [];
  const keyProtection: MasterPasswordSwitchKeyProtection = {
    writeMasterPasswordProtection: (key, masterPassword) => {
      receivedKeys.push(key);
      return writer.writeMasterPasswordProtection(key, masterPassword);
    },
    writeSystemProtection: (key) => {
      receivedKeys.push(key);
      return writer.writeSystemProtection(key);
    },
  };
  const failures: unknown[] = [];
  return {
    switcher: new MasterPasswordSwitch({
      keyFileStore: harness.keyFileStore,
      keyProtection,
      safeStorage,
      isUnlocked: () => options.isUnlocked ?? true,
      onFailure: (error) => failures.push(error),
    }),
    keyFileStore: harness.keyFileStore,
    dataKey,
    recoveryWords: dataKeyToRecoveryWords(dataKey),
    failures,
    receivedKeys,
  };
}

/**
 * 解出密钥文件当前保护着的数据密钥, 切换测试用它确认数据密钥没变.
 * @param rig 测试装置.
 * @param masterPassword 密钥文件是主密码保护时用来解开的主密码.
 * @returns 解出的数据密钥.
 * @throws Error 当密钥文件不存在时.
 */
export async function readProtectedDataKey(
  rig: SwitchRig,
  masterPassword: string,
): Promise<Buffer> {
  const record = await rig.keyFileStore.read();
  if (record === undefined) {
    throw new Error("测试前提不成立: 密钥文件应存在");
  }
  if (record.protection === "master-password") {
    return unprotectWithMasterPassword(record, masterPassword);
  }
  const { dataKey } = await unprotectWithSystem(
    record,
    createFakeSafeStorage(),
  );
  return dataKey;
}
