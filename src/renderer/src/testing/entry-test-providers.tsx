import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";
import type { BatchBridge } from "@shared/batch/batch-bridge";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";
import type { ExportBridge } from "@shared/export/export-bridge";
import type { ImportBridge } from "@shared/import/import-bridge";
import type { LinkBridge } from "@shared/links/link-bridge";
import type { RestoreBridge } from "@shared/restore/restore-bridge";
import type { ReactNode } from "react";

import { AttachmentBridgeProvider } from "@renderer/stores/attachment-bridge-provider";
import { BatchBridgeProvider } from "@renderer/stores/batch-bridge-provider";
import type { BatchSelectionStore } from "@renderer/stores/batch-selection-store";
import { BatchSelectionStoreProvider } from "@renderer/stores/batch-selection-store-provider";
import type { EntryStore } from "@renderer/stores/entry-store";
import { EntryStoreProvider } from "@renderer/stores/entry-store-provider";
import type { EntryTypeStore } from "@renderer/stores/entry-type-store";
import { EntryTypeStoreProvider } from "@renderer/stores/entry-type-store-provider";
import { EmailBackupBridgeProvider } from "@renderer/stores/email-backup-bridge-provider";
import { ExportBridgeProvider } from "@renderer/stores/export-bridge-provider";
import type { FolderStore } from "@renderer/stores/folder-store";
import { FolderStoreProvider } from "@renderer/stores/folder-store-provider";
import { ImportBridgeProvider } from "@renderer/stores/import-bridge-provider";
import { LinkBridgeProvider } from "@renderer/stores/link-bridge-provider";
import { RestoreBridgeProvider } from "@renderer/stores/restore-bridge-provider";
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
  /**
   * 批量桥.
   */
  readonly batchBridge: BatchBridge;
  /**
   * TOTP 桥.
   */
  readonly totpBridge: TotpBridge;
  /**
   * 附件桥.
   */
  readonly attachmentBridge: AttachmentBridge;
  /**
   * 导入桥.
   */
  readonly importBridge: ImportBridge;
  /**
   * 导出桥.
   */
  readonly exportBridge: ExportBridge;
  /**
   * 邮箱备份桥.
   */
  readonly emailBackupBridge: EmailBackupBridge;
  /**
   * 恢复桥.
   */
  readonly restoreBridge: RestoreBridge;
  /**
   * 链接桥.
   */
  readonly linkBridge: LinkBridge;
}

/**
 * 创建包裹被测组件的 Provider: 在保险库 Provider 之内依次注入条目, 自定义类型, 文件夹, 标签,
 * 批量选中 store, 批量桥, TOTP 桥, 附件桥, 导入桥, 导出桥, 邮箱备份桥, 恢复桥与链接桥.
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
                  <BatchBridgeProvider bridge={values.batchBridge}>
                    <TotpBridgeProvider bridge={values.totpBridge}>
                      <AttachmentBridgeProvider
                        bridge={values.attachmentBridge}
                      >
                        <ImportBridgeProvider bridge={values.importBridge}>
                          <ExportBridgeProvider bridge={values.exportBridge}>
                            <EmailBackupBridgeProvider
                              bridge={values.emailBackupBridge}
                            >
                              <RestoreBridgeProvider
                                bridge={values.restoreBridge}
                              >
                                <LinkBridgeProvider bridge={values.linkBridge}>
                                  {props.children}
                                </LinkBridgeProvider>
                              </RestoreBridgeProvider>
                            </EmailBackupBridgeProvider>
                          </ExportBridgeProvider>
                        </ImportBridgeProvider>
                      </AttachmentBridgeProvider>
                    </TotpBridgeProvider>
                  </BatchBridgeProvider>
                </BatchSelectionStoreProvider>
              </TagStoreProvider>
            </FolderStoreProvider>
          </EntryTypeStoreProvider>
        </EntryStoreProvider>
      </VaultProviders>
    );
  };
}
