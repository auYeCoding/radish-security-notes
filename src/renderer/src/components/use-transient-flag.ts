import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 一个短暂生效的标记: 触发后保持生效一段时间再自动还原.
 */
export interface TransientFlag {
  /**
   * 标记当前是否生效.
   */
  readonly isActive: boolean;
  /**
   * 让标记生效. 生效期间再次触发会重新计时.
   */
  readonly raise: () => void;
}

/**
 * 创建一个短暂生效的标记, 组件卸载时取消计时.
 * @param durationMilliseconds 标记生效的时长, 单位毫秒.
 * @returns 标记状态与触发方法.
 */
export function useTransientFlag(durationMilliseconds: number): TransientFlag {
  const [isActive, setIsActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const raise = useCallback(() => {
    clearTimeout(timer.current);
    setIsActive(true);
    timer.current = setTimeout(() => setIsActive(false), durationMilliseconds);
  }, [durationMilliseconds]);
  return { isActive, raise };
}
