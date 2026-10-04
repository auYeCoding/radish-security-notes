import type { BatchBridge } from "@shared/batch/batch-bridge";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { ReactNode } from "react";

import { BatchBridgeProvider } from "@renderer/stores/batch-bridge-provider";
import type { BatchSelectionStore } from "@renderer/stores/batch-selection-store";
import { BatchSelectionStoreProvider } from "@renderer/stores/batch-selection-store-provider";
import type { EntryStore } from "@renderer/stores/entry-store";
import { EntryStoreProvider } from "@renderer/stores/entry-store-provider";
import type { FolderStore } from "@renderer/stores/folder-store";
import { FolderStoreProvider } from "@renderer/stores/folder-store-provider";
import type { TagStore } from "@renderer/stores/tag-store";
import { TagStoreProvider } from "@renderer/stores/tag-store-provider";
import { TotpBridgeProvider } from "@renderer/stores/totp-bridge-provider";

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
 * 条目测试 Provider 需要注入的 store 与桥.
 */
export interface EntryTestProviderValues {
  /**
   * 偏好与保险库的 Provider, 来自保险库测试环境.
   */
  readonly VaultProviders: (
    props: EntryTestProvidersProps,
  ) => React.JSX.Element;
  /**
   * 条目 store.
   */
  readonly entryStore: EntryStore;
  /**
   * 文件夹 store.
   */
  readonly folderStore: FolderStore;
  /**
   * 标签 store.
   */
  readonly tagStore: TagStore;
  /**
   * 批量选中 store.
   */
  readonly batchSelectionStore: BatchSelectionStore;
  /**
   * 批量桥.
   */
  readonly batchBridge: BatchBridge;
  /**
   * TOTP 桥.
   */
  readonly totpBridge: TotpBridge;
}

/**
 * 创建包裹被测组件的 Provider: 在保险库 Provider 之内依次注入条目, 文件夹, 标签, 批量选中 store,
 * 批量桥与 TOTP 桥.
 * @param values 要注入的 store 与桥.
 * @returns Provider 组件.
 */
export function createEntryTestProviders(
  values: EntryTestProviderValues,
): (props: EntryTestProvidersProps) => React.JSX.Element {
  const { VaultProviders } = values;
  return function EntryTestProviders(
    props: EntryTestProvidersProps,
  ): React.JSX.Element {
    return (
      <VaultProviders>
        <EntryStoreProvider store={values.entryStore}>
          <FolderStoreProvider store={values.folderStore}>
            <TagStoreProvider store={values.tagStore}>
              <BatchSelectionStoreProvider store={values.batchSelectionStore}>
                <BatchBridgeProvider bridge={values.batchBridge}>
                  <TotpBridgeProvider bridge={values.totpBridge}>
                    {props.children}
                  </TotpBridgeProvider>
                </BatchBridgeProvider>
              </BatchSelectionStoreProvider>
            </TagStoreProvider>
          </FolderStoreProvider>
        </EntryStoreProvider>
      </VaultProviders>
    );
  };
}
