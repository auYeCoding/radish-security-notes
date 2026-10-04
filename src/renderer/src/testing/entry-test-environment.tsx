import type { BatchBridge } from "@shared/batch/batch-bridge";
import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryDetail } from "@shared/entries/entry-types";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { FolderBridge } from "@shared/folders/folder-bridge";
import type { FolderSummary } from "@shared/folders/folder-types";
import type { TagBridge } from "@shared/tags/tag-bridge";
import type { TagSummary } from "@shared/tags/tag-types";

import {
  createBatchSelectionStore,
  type BatchSelectionStore,
} from "@renderer/stores/batch-selection-store";
import {
  createEntryStore,
  type EntryStore,
} from "@renderer/stores/entry-store";
import {
  createFolderStore,
  type FolderStore,
} from "@renderer/stores/folder-store";
import { createTagStore, type TagStore } from "@renderer/stores/tag-store";

import { createEntryTestProviders } from "./entry-test-providers";
import { createFakeBatchBridge } from "./fake-batch-bridge";
import { createFakeEntryBridge } from "./fake-entry-bridge";
import { createFakeFolderBridge } from "./fake-folder-bridge";
import { createFakeTagBridge } from "./fake-tag-bridge";
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
   * 覆盖假批量桥上的方法, 例如让批量删除失败.
   */
  readonly batchBridgeOverrides?: Partial<BatchBridge>;
  /**
   * 覆盖假 TOTP 桥上的方法, 例如让取码失败.
   */
  readonly totpBridgeOverrides?: Partial<TotpBridge>;
  /**
   * 假文件夹桥里的初始文件夹, 按创建先后排列, 默认没有文件夹.
   */
  readonly folders?: readonly FolderSummary[];
  /**
   * 覆盖假文件夹桥上的方法, 例如让删除失败.
   */
  readonly folderBridgeOverrides?: Partial<FolderBridge>;
  /**
   * 假标签桥里的初始标签, 按创建先后排列, 默认没有标签.
   */
  readonly tags?: readonly TagSummary[];
  /**
   * 覆盖假标签桥上的方法, 例如让删除失败.
   */
  readonly tagBridgeOverrides?: Partial<TagBridge>;
}

/**
 * 组件测试用的条目环境: 在保险库环境之上增加假的条目桥, 真实的条目 store, 假的文件夹桥, 真实的
 * 文件夹 store, 假的标签桥, 真实的标签 store, 假的批量桥, 真实的批量选中 store 与假的 TOTP 桥.
 */
export interface EntryTestEnvironment extends VaultTestEnvironment {
  /**
   * 带间谍方法的假条目桥.
   */
  readonly entryBridge: EntryBridge;
  /**
   * 带间谍方法的假批量桥, 与假条目桥共享条目数据.
   */
  readonly batchBridge: BatchBridge;
  /**
   * 被测的批量选中 store.
   */
  readonly batchSelectionStore: BatchSelectionStore;
  /**
   * 带间谍方法的假 TOTP 桥.
   */
  readonly totpBridge: TotpBridge;
  /**
   * 被测的条目 store.
   */
  readonly entryStore: EntryStore;
  /**
   * 带间谍方法的假文件夹桥.
   */
  readonly folderBridge: FolderBridge;
  /**
   * 被测的文件夹 store.
   */
  readonly folderStore: FolderStore;
  /**
   * 带间谍方法的假标签桥.
   */
  readonly tagBridge: TagBridge;
  /**
   * 被测的标签 store.
   */
  readonly tagStore: TagStore;
}

/**
 * 条目测试环境里的假桥.
 */
type EntryTestBridges = Pick<
  EntryTestEnvironment,
  "entryBridge" | "batchBridge" | "totpBridge" | "folderBridge" | "tagBridge"
>;

/**
 * 按选项创建条目测试环境里的全部假桥, 假条目桥与假批量桥共享同一份条目数据.
 * @param options 初始条目, 文件夹与标签, 桥方法的覆盖.
 * @returns 假桥.
 */
function createEntryTestBridges(
  options: EntryTestEnvironmentOptions,
): EntryTestBridges {
  const details = [...(options.entries ?? [])];
  return {
    entryBridge: createFakeEntryBridge(
      options.entries,
      options.entryBridgeOverrides,
      options.tags,
      details,
    ),
    batchBridge: createFakeBatchBridge(details, options.batchBridgeOverrides),
    totpBridge: createFakeTotpBridge(options.totpBridgeOverrides),
    folderBridge: createFakeFolderBridge(
      options.folders,
      options.folderBridgeOverrides,
    ),
    tagBridge: createFakeTagBridge(options.tags, options.tagBridgeOverrides),
  };
}

/**
 * 创建组件测试用的条目环境, 保险库默认已解锁.
 * @param options 保险库初始状态, 初始条目, 文件夹与标签, 桥方法的覆盖.
 * @returns 条目环境, 其 `Providers` 同时注入偏好, 保险库, 条目, 文件夹, 标签, 批量选中六个 store,
 * 批量桥与 TOTP 桥.
 */
export async function createEntryTestEnvironment(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const vault = await createVaultTestEnvironment({
    status: "unlocked",
    ...options,
  });
  const bridges = createEntryTestBridges(options);
  const { entryBridge, batchBridge, totpBridge, folderBridge, tagBridge } =
    bridges;
  const batchSelectionStore = createBatchSelectionStore();
  const entryStore = createEntryStore({ bridge: entryBridge });
  const folderStore = createFolderStore({ bridge: folderBridge });
  const tagStore = createTagStore({ bridge: tagBridge });
  const Providers = createEntryTestProviders({
    VaultProviders: vault.Providers,
    entryStore,
    folderStore,
    tagStore,
    batchSelectionStore,
    batchBridge,
    totpBridge,
  });
  return {
    ...vault,
    entryBridge,
    batchBridge,
    batchSelectionStore,
    totpBridge,
    entryStore,
    folderBridge,
    folderStore,
    tagBridge,
    tagStore,
    Providers,
  };
}
