import { afterEach, beforeEach } from "vitest";

import { KeyFileStore } from "../vault/key-file-store";
import { createLockRegistry, type LockRegistry } from "../vault/lock-registry";
import type { SafeStoragePort } from "../vault/safe-storage-port";
import type { SystemKeyPersistence } from "../vault/system-key-persistence";
import { resolveVaultPaths, type VaultPaths } from "../vault/vault-paths";
import { VaultService } from "../vault/vault-service";
import { MIGRATIONS_FOLDER } from "./migrations-folder";
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "./temporary-directory";
import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "./vault-test-fixtures";

/**
 * 测试里默认的系统密钥落盘等待器: 立即视为已落盘.
 */
const ALWAYS_PERSISTED_SYSTEM_KEY: SystemKeyPersistence = {
  waitUntilPersisted: () => Promise.resolve(true),
};

/**
 * 创建服务时可覆盖的依赖.
 */
export interface CreateServiceOptions {
  /**
   * 替换默认的假 safeStorage.
   */
  readonly safeStorage?: SafeStoragePort;
  /**
   * 替换默认的系统密钥落盘等待器, 默认立即视为已落盘.
   */
  readonly systemKeyPersistence?: SystemKeyPersistence;
  /**
   * 替换默认的空锁定登记处, 锁定测试用它登记任务探测与释放动作.
   */
  readonly lockRegistry?: LockRegistry;
}

/**
 * 保险库服务测试的环境: 临时用户数据目录, 真实的密钥文件存储, 假 safeStorage 与可重复创建的服务.
 */
export interface VaultServiceHarness {
  /**
   * 保险库在临时目录中的路径.
   */
  readonly paths: VaultPaths;
  /**
   * 指向临时目录的密钥文件存储.
   */
  readonly keyFileStore: KeyFileStore;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
  /**
   * 创建一个新的服务, 相当于应用重新启动.
   * @param options 可覆盖的依赖.
   * @returns 尚未初始化的服务.
   */
  readonly createService: (options?: CreateServiceOptions) => VaultService;
  /**
   * 关闭创建过的全部服务并删除临时目录.
   * @returns 完成后兑现.
   */
  readonly dispose: () => Promise<void>;
}

/**
 * 创建保险库服务测试环境.
 * @returns 测试环境.
 */
export async function createVaultServiceHarness(): Promise<VaultServiceHarness> {
  const directory = await createTemporaryDirectory("vault-service");
  const paths = resolveVaultPaths(directory);
  const keyFileStore = new KeyFileStore(paths);
  const failures: unknown[] = [];
  const services: VaultService[] = [];
  return {
    paths,
    keyFileStore,
    failures,
    createService: (options = {}) => {
      const service = new VaultService({
        paths,
        keyFileStore,
        safeStorage: options.safeStorage ?? createFakeSafeStorage(),
        systemKeyPersistence:
          options.systemKeyPersistence ?? ALWAYS_PERSISTED_SYSTEM_KEY,
        migrationsFolder: MIGRATIONS_FOLDER,
        argon2Parameters: FAST_ARGON2_PARAMETERS,
        lockRegistry: options.lockRegistry ?? createLockRegistry(),
        onFailure: (error) => failures.push(error),
      });
      services.push(service);
      return service;
    },
    dispose: async () => {
      services.forEach((service) => service.close());
      await removeTemporaryDirectory(directory);
    },
  };
}

/**
 * 创建并初始化一个服务, 相当于应用启动一次.
 * @param harness 测试环境.
 * @param options 可覆盖的依赖.
 * @returns 已初始化的服务.
 */
export async function startService(
  harness: VaultServiceHarness,
  options?: CreateServiceOptions,
): Promise<VaultService> {
  const service = harness.createService(options);
  await service.initialize();
  return service;
}

/**
 * 用测试主密码完成首次设置, 然后关闭服务, 相当于设置主密码后退出应用.
 * @param harness 测试环境.
 * @returns 完成后兑现.
 */
export async function prepareMasterPasswordVault(
  harness: VaultServiceHarness,
): Promise<void> {
  const service = await startService(harness);
  await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  service.close();
}

/**
 * 跳过主密码完成首次设置, 然后关闭服务, 相当于跳过后退出应用.
 * @param harness 测试环境.
 * @returns 完成后兑现.
 */
export async function prepareSystemProtectedVault(
  harness: VaultServiceHarness,
): Promise<void> {
  const service = await startService(harness);
  await service.setupWithoutMasterPassword();
  service.close();
}

/**
 * 在当前测试分组中登记钩子: 每个测试前创建测试环境, 测试后释放.
 * @returns 取得当前测试环境的函数.
 */
export function useVaultServiceHarness(): () => VaultServiceHarness {
  let current: VaultServiceHarness | undefined;
  beforeEach(async () => {
    current = await createVaultServiceHarness();
  });
  afterEach(async () => {
    await current?.dispose();
  });
  return () => {
    if (current === undefined) {
      throw new Error("测试环境尚未创建");
    }
    return current;
  };
}
