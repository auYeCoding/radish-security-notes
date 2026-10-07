import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEvent } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import type { MasterPasswordState } from "@renderer/stores/use-master-password-state";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";
import { useVaultStore } from "@renderer/stores/use-vault-store";
import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

import {
  VERIFY_DEFAULT_VALUES,
  VERIFY_SCHEMAS,
  type RecoveryKeyVerifyValues,
} from "./recovery-key-verify-schema";

/**
 * 验证表单的状态与提交方法.
 */
export interface RecoveryKeyVerifyHandle {
  /**
   * 验证表单.
   */
  readonly form: UseFormReturn<RecoveryKeyVerifyValues>;
  /**
   * 最近一次提交失败的原因, 没有失败时为 undefined.
   */
  readonly failureReason: VaultFailureReason | undefined;
  /**
   * 表单提交时的处理: 读不到主密码状态时改为重试, 否则校验并向主进程取恢复词.
   */
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * 查看恢复密钥验证表单的逻辑: 设了主密码时只校验当前主密码并带给主进程, 由系统保护时只校验确认
 * 勾选, 不带主密码. 验证通过后把主进程给出的恢复词交给回调.
 * @param protection 主密码当前的状态, 取自主进程里密钥文件的保护方式.
 * @param onRetry 读不到主密码状态时, 重新读取的回调.
 * @param onVerified 验证通过后拿到恢复词的回调.
 * @returns 表单, 失败原因与提交处理.
 */
export function useRecoveryKeyVerifyForm(
  protection: MasterPasswordState,
  onRetry: () => void,
  onVerified: (words: readonly string[]) => void,
): RecoveryKeyVerifyHandle {
  const viewRecoveryKey = useVaultStore((state) => state.viewRecoveryKey);
  const { failureReason, run } = useVaultOperation();
  const isPasswordRequired = protection === "enabled";
  const form = useForm<RecoveryKeyVerifyValues>({
    resolver: zodResolver(
      VERIFY_SCHEMAS[isPasswordRequired ? "master-password" : "system"],
    ),
    defaultValues: VERIFY_DEFAULT_VALUES,
  });
  const submit = async (values: RecoveryKeyVerifyValues): Promise<void> => {
    const password = isPasswordRequired ? values.currentPassword : undefined;
    const result = await run(() => viewRecoveryKey(password));
    if (result.ok) {
      onVerified(result.recoveryWords);
    }
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    if (protection === "unavailable") {
      event.preventDefault();
      onRetry();
      return;
    }
    void form.handleSubmit(submit)(event);
  };
  return { form, failureReason, handleSubmit };
}
