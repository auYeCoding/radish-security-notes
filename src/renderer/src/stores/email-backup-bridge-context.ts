import { createContext } from "react";

import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";

/**
 * 邮箱备份桥的 React 上下文, 没有 Provider 时取值为 undefined. 设置的读写, 备份的生成与发送都在
 * 主进程里完成, 渲染端只经桥拿到 "已设置" 一类标志, 进度与摘要, 由邮箱备份对话框自己持有.
 */
export const EmailBackupBridgeContext = createContext<
  EmailBackupBridge | undefined
>(undefined);
