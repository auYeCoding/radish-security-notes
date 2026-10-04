import type { ReactNode } from "react";

import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";

import { AttachmentBridgeContext } from "./attachment-bridge-context";

/**
 * 附件桥 Provider 的属性.
 */
interface AttachmentBridgeProviderProps {
  /**
   * 要注入的附件桥.
   */
  readonly bridge: AttachmentBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把附件桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function AttachmentBridgeProvider(
  props: AttachmentBridgeProviderProps,
): React.JSX.Element {
  return (
    <AttachmentBridgeContext.Provider value={props.bridge}>
      {props.children}
    </AttachmentBridgeContext.Provider>
  );
}
