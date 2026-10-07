import { useCallback, useEffect, useState } from "react";

import { useMasterPasswordBridge } from "./use-master-password-bridge";

/**
 * 主密码当前的状态: 还在读取, 已开启, 未开启, 或读取失败无法判断.
 */
export type MasterPasswordState =
  "loading" | "enabled" | "disabled" | "unavailable";

/**
 * 主密码状态与重新读取它的方法.
 */
export interface MasterPasswordStateHandle {
  /**
   * 主密码当前的状态, 取自主进程里密钥文件的保护方式.
   */
  readonly state: MasterPasswordState;
  /**
   * 重新向主进程读取状态, 读取期间保留上一次的状态, 不闪回读取中.
   */
  readonly refresh: () => void;
}

/**
 * 向主进程读取保险库是否设了主密码并持有结果. 切换成功后调用 `refresh` 重新读取, 状态以主进程
 * 为准, 不在渲染端猜测. 迟到的旧结果被忽略.
 * @returns 主密码状态与重新读取的方法.
 */
export function useMasterPasswordState(): MasterPasswordStateHandle {
  const bridge = useMasterPasswordBridge();
  const [state, setState] = useState<MasterPasswordState>("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let isCurrent = true;
    void bridge.hasMasterPassword().then(
      (hasMasterPassword) => {
        if (isCurrent) {
          setState(hasMasterPassword ? "enabled" : "disabled");
        }
      },
      () => {
        if (isCurrent) {
          setState("unavailable");
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [bridge, revision]);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  return { state, refresh };
}
