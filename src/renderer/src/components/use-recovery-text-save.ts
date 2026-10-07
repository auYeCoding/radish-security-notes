import { useCallback, useState } from "react";

import type { RecoveryTextFileStatus } from "@shared/vault/recovery-bridge";

/**
 * 把恢复词保存为文本文件的函数, 由调用方提供, 通常经主进程弹出系统保存对话框.
 */
export type SaveRecoveryTextFile = (
  words: readonly string[],
) => Promise<RecoveryTextFileStatus>;

/**
 * 保存文本文件的进度: 空闲, 保存中, 已保存, 保存失败. 用户在对话框里取消时回到空闲.
 */
export type RecoveryTextSaveState = "idle" | "pending" | "saved" | "failed";

/**
 * 保存恢复词文本文件的进度与触发方法.
 */
export interface RecoveryTextSave {
  /**
   * 当前进度.
   */
  readonly state: RecoveryTextSaveState;
  /**
   * 弹出系统保存对话框并保存, 结果反映到 `state`.
   * @returns 保存流程结束后兑现.
   */
  readonly save: () => Promise<void>;
}

/**
 * 跟踪恢复词文本文件的保存进度.
 * @param words 要保存的 24 个词.
 * @param saveTextFile 把词保存为文本文件的函数.
 * @returns 进度与触发方法.
 */
export function useRecoveryTextSave(
  words: readonly string[],
  saveTextFile: SaveRecoveryTextFile,
): RecoveryTextSave {
  const [state, setState] = useState<RecoveryTextSaveState>("idle");
  const save = useCallback(async (): Promise<void> => {
    setState("pending");
    try {
      const status = await saveTextFile(words);
      setState(status === "cancelled" ? "idle" : status);
    } catch {
      setState("failed");
    }
  }, [saveTextFile, words]);
  return { state, save };
}
