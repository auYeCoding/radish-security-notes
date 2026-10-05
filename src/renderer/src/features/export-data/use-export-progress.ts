import { useEffect, useState } from "react";

import type { ExportProgressSnapshot } from "@shared/export/export-types";

import { useExportBridge } from "@renderer/stores/use-export-bridge";

/**
 * 轮询导出进度的间隔, 单位毫秒.
 */
export const EXPORT_PROGRESS_POLL_MILLISECONDS = 150;

/**
 * 在主进程处理期间定期读取导出进度. 进度通过请求应答读取, 不依赖主进程推送.
 * @param isActive 是否正在处理, 为假时不轮询.
 * @returns 最近一次读到的进度快照, 没有处理或还没读到时为 undefined.
 */
export function useExportProgress(
  isActive: boolean,
): ExportProgressSnapshot | undefined {
  const bridge = useExportBridge();
  const [snapshot, setSnapshot] = useState<ExportProgressSnapshot | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    let isCurrent = true;
    const poll = async (): Promise<void> => {
      const next = await bridge.getProgress();
      if (isCurrent) {
        setSnapshot(next);
      }
    };
    void poll();
    const timer = setInterval(
      () => void poll(),
      EXPORT_PROGRESS_POLL_MILLISECONDS,
    );
    return () => {
      isCurrent = false;
      clearInterval(timer);
      setSnapshot(undefined);
    };
  }, [bridge, isActive]);
  return isActive ? snapshot : undefined;
}
