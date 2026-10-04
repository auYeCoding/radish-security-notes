import type { ReactNode } from "react";

import type { RendererApi } from "@shared/ipc/renderer-api";

import { AttachmentBridgeProvider } from "./attachment-bridge-provider";
import { BatchBridgeProvider } from "./batch-bridge-provider";
import { LinkBridgeProvider } from "./link-bridge-provider";
import { TotpBridgeProvider } from "./totp-bridge-provider";

/**
 * 桥 Provider 组合的属性.
 */
interface BridgeProvidersProps {
  /**
   * preload 暴露的接口, 取其中按需读取数据的批量, TOTP, 附件与链接四个桥.
   */
  readonly api: Pick<RendererApi, "batch" | "totp" | "attachments" | "links">;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把批量桥, TOTP 桥, 附件桥与链接桥注入其下的组件树. 这四个桥不放进全局状态, 组件按需经桥读取.
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
          <LinkBridgeProvider bridge={api.links}>
            {props.children}
          </LinkBridgeProvider>
        </AttachmentBridgeProvider>
      </TotpBridgeProvider>
    </BatchBridgeProvider>
  );
}
