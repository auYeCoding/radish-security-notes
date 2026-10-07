import type { ReactNode } from "react";

import type { BatchSelectionStore } from "@renderer/stores/batch-selection-store";
import { BatchSelectionStoreProvider } from "@renderer/stores/batch-selection-store-provider";
import type { EntryStore } from "@renderer/stores/entry-store";
import { EntryStoreProvider } from "@renderer/stores/entry-store-provider";
import type { EntryTypeStore } from "@renderer/stores/entry-type-store";
import { EntryTypeStoreProvider } from "@renderer/stores/entry-type-store-provider";
import type { FolderStore } from "@renderer/stores/folder-store";
import { FolderStoreProvider } from "@renderer/stores/folder-store-provider";
import type { TagStore } from "@renderer/stores/tag-store";
import { TagStoreProvider } from "@renderer/stores/tag-store-provider";

import {
  EntryTestBridgeProviders,
  type EntryTestBridgeValues,
} from "./entry-test-bridge-providers";

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
export interface EntryTestProviderValues extends EntryTestBridgeValues {
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
   * 自定义条目类型 store.
   */
  readonly entryTypeStore: EntryTypeStore;
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
}

/**
 * 创建包裹被测组件的 Provider: 在保险库 Provider 之内依次注入条目, 自定义类型, 文件夹, 标签,
 * 批量选中 store, 再注入全部的桥.
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
          <EntryTypeStoreProvider store={values.entryTypeStore}>
            <FolderStoreProvider store={values.folderStore}>
              <TagStoreProvider store={values.tagStore}>
                <BatchSelectionStoreProvider store={values.batchSelectionStore}>
                  <EntryTestBridgeProviders values={values}>
                    {props.children}
                  </EntryTestBridgeProviders>
                </BatchSelectionStoreProvider>
              </TagStoreProvider>
            </FolderStoreProvider>
          </EntryTypeStoreProvider>
        </EntryStoreProvider>
      </VaultProviders>
    );
  };
}
