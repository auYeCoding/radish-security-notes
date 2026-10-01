import type { VaultBridge } from "@shared/vault/vault-bridge";
import { VAULT_OPERATION_SUCCEEDED } from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import type { ReactNode } from "react";
import { vi } from "vitest";

import {
  createVaultStore,
  type VaultStore,
} from "@renderer/stores/vault-store";
import { VaultStoreProvider } from "@renderer/stores/vault-store-provider";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "./preferences-test-environment";

/**
 * 创建保险库测试环境的选项.
 */
export interface VaultTestEnvironmentOptions {
  /**
   * 保险库的初始状态, 默认是 needs-setup.
   */
  readonly status?: VaultStatus;
  /**
   * 覆盖假保险库桥上的方法, 例如让解锁失败.
   */
  readonly bridgeOverrides?: Partial<VaultBridge>;
}

/**
 * 包裹被测组件的 Provider 的属性.
 */
interface VaultTestProvidersProps {
  /**
   * 被测组件.
   */
  readonly children: ReactNode;
}

/**
 * 组件测试用的保险库环境: 在偏好环境之上增加假的保险库桥与真实的保险库 store.
 */
export interface VaultTestEnvironment extends PreferencesTestEnvironment {
  /**
   * 带间谍方法的假保险库桥.
   */
  readonly vaultBridge: VaultBridge;
  /**
   * 被测的保险库 store.
   */
  readonly vaultStore: VaultStore;
}

/**
 * 创建组件测试用的保险库环境, 桥的方法默认都成功.
 * @param options 初始状态与桥方法的覆盖.
 * @returns 保险库环境, 其 `Providers` 同时注入偏好与保险库两个 store.
 */
export async function createVaultTestEnvironment(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const status = options.status ?? "needs-setup";
  const preferences = await createPreferencesTestEnvironment();
  const vaultBridge: VaultBridge = {
    getStatus: vi.fn(() => Promise.resolve(status)),
    setupWithMasterPassword: vi.fn(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    ),
    setupWithoutMasterPassword: vi.fn(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    ),
    unlock: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    ...options.bridgeOverrides,
  };
  const vaultStore = createVaultStore({
    bridge: vaultBridge,
    initialStatus: status,
  });
  const Providers = (props: VaultTestProvidersProps): React.JSX.Element => (
    <preferences.Providers>
      <VaultStoreProvider store={vaultStore}>
        {props.children}
      </VaultStoreProvider>
    </preferences.Providers>
  );
  return { ...preferences, vaultBridge, vaultStore, Providers };
}
