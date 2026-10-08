import { useEffect, useState } from "react";

import type { ImportProgressSnapshot } from "@shared/import/import-types";

import { detachPromise } from "@renderer/lib/detach-promise";
import { useImportBridge } from "@renderer/stores/use-import-bridge";

/**
 * 轮询导入进度的间隔, 单位毫秒.
 */
export const IMPORT_PROGRESS_POLL_MILLISECONDS = 150;

/**
 * 在主进程处理期间定期读取导入进度. 进度通过请求应答读取, 不依赖主进程推送.
 * @param isActive 是否正在处理, 为假时不轮询.
 * @returns 最近一次读到的进度快照, 没有处理或还没读到时为 undefined.
 */
export function useImportProgress(
  isActive: boolean,
): ImportProgressSnapshot | undefined {
  const bridge = useImportBridge();
  const [snapshot, setSnapshot] = useState<ImportProgressSnapshot | undefined>(
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
    detachPromise(poll());
    const timer = setInterval(
      () => detachPromise(poll()),
      IMPORT_PROGRESS_POLL_MILLISECONDS,
    );
    return () => {
      isCurrent = false;
      clearInterval(timer);
      setSnapshot(undefined);
    };
  }, [bridge, isActive]);
  return isActive ? snapshot : undefined;
}
