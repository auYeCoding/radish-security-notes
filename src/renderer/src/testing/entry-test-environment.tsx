import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryDetail } from "@shared/entries/entry-types";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { ReactNode } from "react";

import {
  createEntryStore,
  type EntryStore,
} from "@renderer/stores/entry-store";
import { EntryStoreProvider } from "@renderer/stores/entry-store-provider";
import { TotpBridgeProvider } from "@renderer/stores/totp-bridge-provider";

import { createFakeEntryBridge } from "./fake-entry-bridge";
import { createFakeTotpBridge } from "./fake-totp-bridge";
import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "./vault-test-environment";

/**
 * 创建条目测试环境的选项.
 */
export interface EntryTestEnvironmentOptions extends VaultTestEnvironmentOptions {
  /**
   * 假条目桥里的初始条目, 按最新创建在前排列, 默认没有条目.
   */
  readonly entries?: readonly EntryDetail[];
  /**
   * 覆盖假条目桥上的方法, 例如让复制失败.
   */
  readonly entryBridgeOverrides?: Partial<EntryBridge>;
  /**
   * 覆盖假 TOTP 桥上的方法, 例如让取码失败.
   */
  readonly totpBridgeOverrides?: Partial<TotpBridge>;
}

/**
 * 包裹被测组件的 Provider 的属性.
 */
interface EntryTestProvidersProps {
  /**
   * 被测组件.
   */
  readonly children: ReactNode;
}

/**
 * 组件测试用的条目环境: 在保险库环境之上增加假的条目桥, 真实的条目 store 与假的 TOTP 桥.
 */
export interface EntryTestEnvironment extends VaultTestEnvironment {
  /**
   * 带间谍方法的假条目桥.
   */
  readonly entryBridge: EntryBridge;
  /**
   * 带间谍方法的假 TOTP 桥.
   */
  readonly totpBridge: TotpBridge;
  /**
   * 被测的条目 store.
   */
  readonly entryStore: EntryStore;
}

/**
 * 创建组件测试用的条目环境, 保险库默认已解锁.
 * @param options 保险库初始状态, 初始条目与桥方法的覆盖.
 * @returns 条目环境, 其 `Providers` 同时注入偏好, 保险库, 条目三个 store 与 TOTP 桥.
 */
export async function createEntryTestEnvironment(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const vault = await createVaultTestEnvironment({
    status: "unlocked",
    ...options,
  });
  const entryBridge = createFakeEntryBridge(
    options.entries,
    options.entryBridgeOverrides,
  );
  const totpBridge = createFakeTotpBridge(options.totpBridgeOverrides);
  const entryStore = createEntryStore({ bridge: entryBridge });
  const Providers = (props: EntryTestProvidersProps): React.JSX.Element => (
    <vault.Providers>
      <EntryStoreProvider store={entryStore}>
        <TotpBridgeProvider bridge={totpBridge}>
          {props.children}
        </TotpBridgeProvider>
      </EntryStoreProvider>
    </vault.Providers>
  );
  return { ...vault, entryBridge, totpBridge, entryStore, Providers };
}
