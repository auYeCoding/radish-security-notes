import type { ReactNode } from "react";

import type { RendererApi } from "@shared/ipc/renderer-api";

import { AttachmentBridgeProvider } from "./attachment-bridge-provider";
import { BatchBridgeProvider } from "./batch-bridge-provider";
import { EmailBackupBridgeProvider } from "./email-backup-bridge-provider";
import { ExportBridgeProvider } from "./export-bridge-provider";
import { ImportBridgeProvider } from "./import-bridge-provider";
import { LinkBridgeProvider } from "./link-bridge-provider";
import { MasterPasswordBridgeProvider } from "./master-password-bridge-provider";
import { RestoreBridgeProvider } from "./restore-bridge-provider";
import { TotpBridgeProvider } from "./totp-bridge-provider";
import { WindowControlsBridgeProvider } from "./window-controls-bridge-provider";

/**
 * 桥 Provider 组合的属性.
 */
interface BridgeProvidersProps {
  /**
   * preload 暴露的接口, 取其中按需读取数据的批量, TOTP, 附件, 导入, 导出, 邮箱备份, 恢复, 主密码开关, 链接与窗口控制十个桥.
   */
  readonly api: Pick<
    RendererApi,
    | "batch"
    | "totp"
    | "attachments"
    | "importer"
    | "exporter"
    | "emailBackup"
    | "restorer"
    | "masterPassword"
    | "links"
    | "windowControls"
  >;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把批量桥, TOTP 桥, 附件桥, 导入桥, 导出桥, 邮箱备份桥, 恢复桥, 主密码开关桥, 链接桥与窗口控制桥
 * 注入其下的组件树. 这十个桥不放进全局状态, 组件按需经桥读取.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider 组合.
 */
export function BridgeProviders(
  props: BridgeProvidersProps,
): React.JSX.Element {
  const { api } = props;
  return (
    <BatchBridgeProvider bridge={api.batch}>
      <TotpBridgeProvider bridge={api.totp}>
        <AttachmentBridgeProvider bridge={api.attachments}>
          <ImportBridgeProvider bridge={api.importer}>
            <ExportBridgeProvider bridge={api.exporter}>
              <EmailBackupBridgeProvider bridge={api.emailBackup}>
                <RestoreBridgeProvider bridge={api.restorer}>
                  <MasterPasswordBridgeProvider bridge={api.masterPassword}>
                    <LinkBridgeProvider bridge={api.links}>
                      <WindowControlsBridgeProvider bridge={api.windowControls}>
                        {props.children}
                      </WindowControlsBridgeProvider>
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
