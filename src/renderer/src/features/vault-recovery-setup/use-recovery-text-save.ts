import { useCallback, useState } from "react";

import { useVaultStore } from "@renderer/stores/use-vault-store";

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
 * @returns 进度与触发方法.
 */
export function useRecoveryTextSave(
  words: readonly string[],
): RecoveryTextSave {
  const saveRecoveryTextFile = useVaultStore(
    (state) => state.saveRecoveryTextFile,
  );
  const [state, setState] = useState<RecoveryTextSaveState>("idle");
  const save = useCallback(async (): Promise<void> => {
    setState("pending");
    try {
      const status = await saveRecoveryTextFile(words);
      setState(status === "cancelled" ? "idle" : status);
    } catch {
      setState("failed");
    }
  }, [saveRecoveryTextFile, words]);
  return { state, save };
}
