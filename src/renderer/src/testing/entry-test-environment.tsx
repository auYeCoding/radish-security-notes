import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";
import type { BatchBridge } from "@shared/batch/batch-bridge";
import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryDetail } from "@shared/entries/entry-types";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";
import type { ExportBridge } from "@shared/export/export-bridge";
import type { FolderBridge } from "@shared/folders/folder-bridge";
import type { FolderSummary } from "@shared/folders/folder-types";
import type { ImportBridge } from "@shared/import/import-bridge";
import type { LinkBridge } from "@shared/links/link-bridge";
import type { RestoreBridge } from "@shared/restore/restore-bridge";
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
  createEntryTypeStore,
  type EntryTypeStore,
} from "@renderer/stores/entry-type-store";
import {
  createFolderStore,
  type FolderStore,
} from "@renderer/stores/folder-store";
import { createTagStore, type TagStore } from "@renderer/stores/tag-store";

import { createEntryTestProviders } from "./entry-test-providers";
import {
  createFakeAttachmentBridge,
  type FakeAttachmentsByEntry,
} from "./fake-attachment-bridge";
import { createFakeBatchBridge } from "./fake-batch-bridge";
import { createFakeEmailBackupBridge } from "./fake-email-backup-bridge";
import { createFakeEntryBridge } from "./fake-entry-bridge";
import { createFakeEntryTypeBridge } from "./fake-entry-type-bridge";
import { createFakeExportBridge } from "./fake-export-bridge";
import { createFakeFolderBridge } from "./fake-folder-bridge";
import { createFakeImportBridge } from "./fake-import-bridge";
import { createFakeLinkBridge } from "./fake-link-bridge";
import { createFakeRestoreBridge } from "./fake-restore-bridge";
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
   * 假附件桥里的初始附件, 键是条目编号, 默认没有附件.
   */
  readonly attachments?: FakeAttachmentsByEntry;
  /**
   * 覆盖假附件桥上的方法, 例如让添加失败.
   */
  readonly attachmentBridgeOverrides?: Partial<AttachmentBridge>;
  /**
   * 覆盖假导入桥上的方法, 例如让选择文件失败.
   */
  readonly importBridgeOverrides?: Partial<ImportBridge>;
  /**
   * 覆盖假导出桥上的方法, 例如让导出失败.
   */
  readonly exportBridgeOverrides?: Partial<ExportBridge>;
  /**
   * 覆盖假邮箱备份桥上的方法, 例如让发送失败.
   */
  readonly emailBackupBridgeOverrides?: Partial<EmailBackupBridge>;
  /**
   * 覆盖假恢复桥上的方法, 例如让选择文件失败.
   */
  readonly restoreBridgeOverrides?: Partial<RestoreBridge>;
  /**
   * 覆盖假链接桥上的方法, 例如让打开失败.
   */
  readonly linkBridgeOverrides?: Partial<LinkBridge>;
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
  /**
   * 假自定义类型桥里的初始自定义类型, 按创建先后排列, 默认没有自定义类型. 给出时自定义类型 store
   * 已经读取了它们, 不给时 store 保持初始状态, 与未经启动流程读取的状态一样.
   */
  readonly customEntryTypes?: readonly CustomEntryType[];
  /**
   * 覆盖假自定义类型桥上的方法, 例如让新建失败.
   */
  readonly entryTypeBridgeOverrides?: Partial<CustomEntryTypeBridge>;
}

/**
 * 组件测试用的条目环境: 在保险库环境之上增加假的条目桥, 真实的条目 store, 假的自定义类型桥,
 * 真实的自定义类型 store, 假的文件夹桥, 真实的文件夹 store, 假的标签桥, 真实的标签 store, 假的
 * 批量桥, 真实的批量选中 store, 假的 TOTP 桥, 假的附件桥与假的链接桥.
 */
export interface EntryTestEnvironment extends VaultTestEnvironment {
  /**
   * 带间谍方法的假条目桥.
   */
  readonly entryBridge: EntryBridge;
  /**
   * 带间谍方法的假自定义类型桥, 与假条目桥共享自定义类型数据.
   */
  readonly entryTypeBridge: CustomEntryTypeBridge;
  /**
   * 被测的自定义类型 store.
   */
  readonly entryTypeStore: EntryTypeStore;
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
   * 带间谍方法的假附件桥.
   */
  readonly attachmentBridge: AttachmentBridge;
  /**
   * 带间谍方法的假导入桥.
   */
  readonly importBridge: ImportBridge;
  /**
   * 带间谍方法的假导出桥.
   */
  readonly exportBridge: ExportBridge;
  /**
   * 带间谍方法的假邮箱备份桥.
   */
  readonly emailBackupBridge: EmailBackupBridge;
  /**
   * 带间谍方法的假恢复桥.
   */
  readonly restoreBridge: RestoreBridge;
  /**
   * 带间谍方法的假链接桥.
   */
  readonly linkBridge: LinkBridge;
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
  | "entryBridge"
  | "entryTypeBridge"
  | "batchBridge"
  | "totpBridge"
  | "attachmentBridge"
  | "importBridge"
  | "exportBridge"
  | "emailBackupBridge"
  | "restoreBridge"
  | "linkBridge"
  | "folderBridge"
  | "tagBridge"
>;

/**
 * 按选项创建条目测试环境里的全部假桥, 假条目桥与假批量桥共享同一份条目数据, 假条目桥与假自定义
 * 类型桥共享同一份自定义类型数据.
 * @param options 初始条目, 自定义类型, 文件夹与标签, 桥方法的覆盖.
 * @returns 假桥.
 */
function createEntryTestBridges(
  options: EntryTestEnvironmentOptions,
): EntryTestBridges {
  const details = [...(options.entries ?? [])];
  const customTypes = [...(options.customEntryTypes ?? [])];
  return {
    entryBridge: createFakeEntryBridge(
      options.entries,
      options.entryBridgeOverrides,
      options.tags,
      details,
      customTypes,
    ),
    entryTypeBridge: createFakeEntryTypeBridge(
      undefined,
      options.entryTypeBridgeOverrides,
      customTypes,
      details,
    ),
    batchBridge: createFakeBatchBridge(details, options.batchBridgeOverrides),
    totpBridge: createFakeTotpBridge(options.totpBridgeOverrides),
    attachmentBridge: createFakeAttachmentBridge(
      options.attachments,
      options.attachmentBridgeOverrides,
    ),
    importBridge: createFakeImportBridge(options.importBridgeOverrides),
    exportBridge: createFakeExportBridge(options.exportBridgeOverrides),
    emailBackupBridge: createFakeEmailBackupBridge(
      options.emailBackupBridgeOverrides,
    ),
    restoreBridge: createFakeRestoreBridge(options.restoreBridgeOverrides),
    linkBridge: createFakeLinkBridge(options.linkBridgeOverrides),
    folderBridge: createFakeFolderBridge(
      options.folders,
      options.folderBridgeOverrides,
    ),
    tagBridge: createFakeTagBridge(options.tags, options.tagBridgeOverrides),
  };
}

/**
 * 条目测试环境里的真实 store.
 */
type EntryTestStores = Pick<
  EntryTestEnvironment,
  | "entryStore"
  | "entryTypeStore"
  | "folderStore"
  | "tagStore"
  | "batchSelectionStore"
>;

/**
 * 在假桥之上创建条目测试环境里的真实 store.
 * @param bridges 假桥.
 * @returns 条目, 自定义类型, 文件夹, 标签与批量选中 store.
 */
function createEntryTestStores(bridges: EntryTestBridges): EntryTestStores {
  return {
    entryStore: createEntryStore({ bridge: bridges.entryBridge }),
    entryTypeStore: createEntryTypeStore({ bridge: bridges.entryTypeBridge }),
    folderStore: createFolderStore({ bridge: bridges.folderBridge }),
    tagStore: createTagStore({ bridge: bridges.tagBridge }),
    batchSelectionStore: createBatchSelectionStore(),
  };
}

/**
 * 创建组件测试用的条目环境, 保险库默认已解锁.
 * @param options 保险库初始状态, 初始条目, 文件夹与标签, 桥方法的覆盖.
 * @returns 条目环境, 其 `Providers` 同时注入偏好, 保险库, 条目, 自定义类型, 文件夹, 标签, 批量选中
 * 七个 store, 批量桥, TOTP 桥, 附件桥与链接桥.
 */
export async function createEntryTestEnvironment(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const vault = await createVaultTestEnvironment({
    status: "unlocked",
    ...options,
  });
  const bridges = createEntryTestBridges(options);
  const stores = createEntryTestStores(bridges);
  if (options.customEntryTypes !== undefined) {
    await stores.entryTypeStore.getState().load();
  }
  const Providers = createEntryTestProviders({
    VaultProviders: vault.Providers,
    ...stores,
    batchBridge: bridges.batchBridge,
    totpBridge: bridges.totpBridge,
    attachmentBridge: bridges.attachmentBridge,
    importBridge: bridges.importBridge,
    exportBridge: bridges.exportBridge,
    emailBackupBridge: bridges.emailBackupBridge,
    restoreBridge: bridges.restoreBridge,
    linkBridge: bridges.linkBridge,
  });
  return { ...vault, ...bridges, ...stores, Providers };
}
