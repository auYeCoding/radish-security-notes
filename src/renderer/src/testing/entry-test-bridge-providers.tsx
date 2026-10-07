import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";
import type { BatchBridge } from "@shared/batch/batch-bridge";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";
import type { ExportBridge } from "@shared/export/export-bridge";
import type { ImportBridge } from "@shared/import/import-bridge";
import type { LinkBridge } from "@shared/links/link-bridge";
import type { RestoreBridge } from "@shared/restore/restore-bridge";
import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";
import type { ReactNode } from "react";

import { AttachmentBridgeProvider } from "@renderer/stores/attachment-bridge-provider";
import { BatchBridgeProvider } from "@renderer/stores/batch-bridge-provider";
import { EmailBackupBridgeProvider } from "@renderer/stores/email-backup-bridge-provider";
import { ExportBridgeProvider } from "@renderer/stores/export-bridge-provider";
import { ImportBridgeProvider } from "@renderer/stores/import-bridge-provider";
import { LinkBridgeProvider } from "@renderer/stores/link-bridge-provider";
import { MasterPasswordBridgeProvider } from "@renderer/stores/master-password-bridge-provider";
import { RestoreBridgeProvider } from "@renderer/stores/restore-bridge-provider";
import { TotpBridgeProvider } from "@renderer/stores/totp-bridge-provider";

/**
 * 条目测试 Provider 需要注入的按需读取数据的桥.
 */
export interface EntryTestBridgeValues {
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
   * 主密码开关桥.
   */
  readonly masterPasswordBridge: MasterPasswordBridge;
  /**
   * 链接桥.
   */
  readonly linkBridge: LinkBridge;
}

/**
 * 桥 Provider 组合的属性.
 */
interface EntryTestBridgeProvidersProps {
  /**
   * 要注入的桥.
   */
  readonly values: EntryTestBridgeValues;
  /**
   * 被测组件.
   */
  readonly children: ReactNode;
}

/**
 * 依次注入批量桥, TOTP 桥, 附件桥, 导入桥, 导出桥, 邮箱备份桥, 恢复桥, 主密码开关桥与链接桥, 与
 * 全局的 `BridgeProviders` 一一对应.
 * @param props 组件属性.
 * @returns 包裹子节点的桥 Provider 组合.
 */
export function EntryTestBridgeProviders(
  props: EntryTestBridgeProvidersProps,
): React.JSX.Element {
  const { values } = props;
  return (
    <BatchBridgeProvider bridge={values.batchBridge}>
      <TotpBridgeProvider bridge={values.totpBridge}>
        <AttachmentBridgeProvider bridge={values.attachmentBridge}>
          <ImportBridgeProvider bridge={values.importBridge}>
            <ExportBridgeProvider bridge={values.exportBridge}>
              <EmailBackupBridgeProvider bridge={values.emailBackupBridge}>
                <RestoreBridgeProvider bridge={values.restoreBridge}>
                  <MasterPasswordBridgeProvider
                    bridge={values.masterPasswordBridge}
                  >
                    <LinkBridgeProvider bridge={values.linkBridge}>
                      {props.children}
                    </LinkBridgeProvider>
                  </MasterPasswordBridgeProvider>
                </RestoreBridgeProvider>
              </EmailBackupBridgeProvider>
            </ExportBridgeProvider>
          </ImportBridgeProvider>
        </AttachmentBridgeProvider>
      </TotpBridgeProvider>
    </BatchBridgeProvider>
  );
}
