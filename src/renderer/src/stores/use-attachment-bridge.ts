import { useContext } from "react";

import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";

import { AttachmentBridgeContext } from "./attachment-bridge-context";

/**
 * 取出附件桥.
 * @returns 附件桥.
 * @throws Error 组件不在 AttachmentBridgeProvider 内时.
 */
export function useAttachmentBridge(): AttachmentBridge {
  const bridge = useContext(AttachmentBridgeContext);
  if (bridge === undefined) {
    throw new Error(
      "useAttachmentBridge 必须在 AttachmentBridgeProvider 内使用",
    );
  }
  return bridge;
}
