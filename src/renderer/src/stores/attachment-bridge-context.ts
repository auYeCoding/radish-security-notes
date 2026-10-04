import { createContext } from "react";

import type { AttachmentBridge } from "@shared/attachments/attachment-bridge";

/**
 * 附件桥的 React 上下文, 没有 Provider 时取值为 undefined. 附件内容不放进全局状态, 渲染端只经桥
 * 按需读取元数据, 附件区自己持有它们.
 */
export const AttachmentBridgeContext = createContext<
  AttachmentBridge | undefined
>(undefined);
