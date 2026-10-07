import { useEffect, useRef } from "react";

/**
 * 恢复词显示多久之后自动隐藏, 单位毫秒.
 */
export const RECOVERY_KEY_AUTO_HIDE_MILLISECONDS = 120_000;

/**
 * 恢复词自动隐藏前显示的秒数, 供文案说明用.
 */
export const RECOVERY_KEY_AUTO_HIDE_SECONDS =
  RECOVERY_KEY_AUTO_HIDE_MILLISECONDS / 1000;

/**
 * 挂载满固定时长后调用一次回调, 卸载时取消计时. 回调变化不重新计时, 总是调用最新的回调.
 * @param onExpire 时长到了之后要做的事.
 */
export function useAutoHide(onExpire: () => void): void {
  const latestOnExpire = useRef(onExpire);
  useEffect(() => {
    latestOnExpire.current = onExpire;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      latestOnExpire.current();
    }, RECOVERY_KEY_AUTO_HIDE_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, []);
}
