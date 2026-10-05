import { useEffect, useState } from "react";

/**
 * 在处理期间定期读取一个值, 例如主进程里一次长操作的进度. 值通过请求应答读取, 不依赖主进程推送.
 * 不处理时不轮询, 处理结束或组件卸载时停止并丢弃读到的值, 迟到的应答被忽略.
 * @param isActive 是否正在处理, 为假时不轮询.
 * @param read 读取一次值的函数, 调用方用 `useCallback` 保持它稳定, 否则每次渲染都会重新开始轮询.
 * @param intervalMilliseconds 轮询的间隔, 单位毫秒.
 * @returns 最近一次读到的值, 没有处理或还没读到时为 undefined.
 */
export function usePolledValue<Value>(
  isActive: boolean,
  read: () => Promise<Value>,
  intervalMilliseconds: number,
): Value | undefined {
  const [value, setValue] = useState<Value | undefined>(undefined);
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    let isCurrent = true;
    const poll = async (): Promise<void> => {
      const next = await read();
      if (isCurrent) {
        setValue(next);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), intervalMilliseconds);
    return () => {
      isCurrent = false;
      clearInterval(timer);
      setValue(undefined);
    };
  }, [isActive, read, intervalMilliseconds]);
  return isActive ? value : undefined;
}
