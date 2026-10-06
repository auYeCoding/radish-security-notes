import { useCallback } from "react";

import type { RestoreProgressSnapshot } from "@shared/restore/restore-types";

import { usePolledValue } from "@renderer/components/use-polled-value";
import { useRestoreBridge } from "@renderer/stores/use-restore-bridge";

/**
 * 轮询恢复进度的间隔, 单位毫秒.
 */
export const RESTORE_PROGRESS_POLL_MILLISECONDS = 150;

/**
 * 在主进程处理期间定期读取恢复进度. 进度通过请求应答读取, 不依赖主进程推送.
 * @param isActive 是否正在处理, 为假时不轮询.
 * @returns 最近一次读到的进度快照, 没有处理或还没读到时为 undefined.
 */
export function useRestoreProgress(
  isActive: boolean,
): RestoreProgressSnapshot | undefined {
  const bridge = useRestoreBridge();
  const read = useCallback(() => bridge.getProgress(), [bridge]);
  return usePolledValue(isActive, read, RESTORE_PROGRESS_POLL_MILLISECONDS);
}
