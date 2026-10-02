import { useEffect, useState } from "react";

import type { TotpCode } from "@shared/entries/totp-config";

import { useTotpBridge } from "@renderer/stores/use-totp-bridge";

import { computeTotpCountdown } from "./totp-countdown-state";

/**
 * 倒计时刷新的间隔, 单位毫秒.
 */
const TICK_MILLISECONDS = 1000;

/**
 * 还在读取验证码的状态.
 */
interface TotpCodeLoading {
  /**
   * 状态名.
   */
  readonly status: "loading";
}

/**
 * 读取验证码失败的状态.
 */
interface TotpCodeFailed {
  /**
   * 状态名.
   */
  readonly status: "failed";
}

/**
 * 已有验证码的状态.
 */
interface TotpCodeReady {
  /**
   * 状态名.
   */
  readonly status: "ready";
  /**
   * 纯数字的验证码.
   */
  readonly code: string;
  /**
   * 距离换码的剩余秒数.
   */
  readonly remainingSeconds: number;
  /**
   * 换码周期, 单位秒.
   */
  readonly periodSeconds: number;
  /**
   * 是否临近换码.
   */
  readonly isEnding: boolean;
}

/**
 * 验证码的显示状态: 读取中, 读取失败, 或已有验证码与倒计时.
 */
export type TotpCodeState = TotpCodeLoading | TotpCodeFailed | TotpCodeReady;

/**
 * 读取一个条目的验证码并随时间倒数: 向主进程取一次验证码与失效时刻, 之后每秒按本地时钟
 * 更新剩余秒数, 到期时再取下一个验证码. 条目换了就换组件, 调用方要用条目编号作 key.
 * @param entryId 条目编号.
 * @returns 验证码的显示状态.
 */
export function useTotpCode(entryId: string): TotpCodeState {
  const bridge = useTotpBridge();
  const [snapshot, setSnapshot] = useState<TotpCode | undefined>(undefined);
  const [now, setNow] = useState<number | undefined>(undefined);
  const [isFailed, setIsFailed] = useState(false);
  const isExpired =
    snapshot !== undefined && now !== undefined && now >= snapshot.expiresAt;
  const shouldFetch = snapshot === undefined || isExpired;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!shouldFetch || isFailed) {
      return undefined;
    }
    let isCancelled = false;
    void bridge.getCode(entryId).then((result) => {
      if (isCancelled) {
        return;
      }
      if (result.ok) {
        setSnapshot(result.value);
        setNow(Date.now());
        return;
      }
      setIsFailed(true);
    });
    return () => {
      isCancelled = true;
    };
  }, [bridge, entryId, shouldFetch, isFailed]);

  if (isFailed) {
    return { status: "failed" };
  }
  if (snapshot === undefined || now === undefined) {
    return { status: "loading" };
  }
  return {
    status: "ready",
    code: snapshot.code,
    periodSeconds: snapshot.periodSeconds,
    ...computeTotpCountdown(snapshot.expiresAt, now, snapshot.periodSeconds),
  };
}
