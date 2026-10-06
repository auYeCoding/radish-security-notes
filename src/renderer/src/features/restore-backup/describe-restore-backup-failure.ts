import type { TFunction } from "i18next";

import type { RestoreProblem } from "@shared/restore/restore-problem";
import type {
  RestoreFailure,
  RestoreFailureReason,
} from "@shared/restore/restore-result";

/**
 * 每种失败原因对应的文案键.
 */
const FAILURE_MESSAGE_KEYS = {
  "vault-locked": "restore.failure.vault-locked",
  "unexpected-error": "restore.failure.unexpected-error",
  "invalid-input": "restore.failure.invalid-input",
  busy: "restore.failure.busy",
  "no-pending-restore": "restore.failure.no-pending-restore",
  "file-unreadable": "restore.failure.file-unreadable",
  "file-too-large": "restore.failure.file-too-large",
  "not-a-backup": "restore.failure.not-a-backup",
  "wrong-passphrase": "restore.failure.wrong-passphrase",
  "damaged-file": "restore.failure.damaged-file",
  "newer-version": "restore.failure.newer-version",
  "invalid-content": "restore.failure.invalid-content",
  "limit-exceeded": "restore.failure.limit-exceeded",
  "wrong-master-password": "restore.failure.wrong-master-password",
  "replace-not-acknowledged": "restore.failure.replace-not-acknowledged",
} as const satisfies Record<RestoreFailureReason, string>;

/**
 * 把校验发现的第一个问题写成给用户看的文字: 区段, 位置 (有的话) 与原因.
 * @param problem 第一个问题, 失败原因与具体问题无关时为 undefined.
 * @param translate 翻译函数.
 * @returns 问题文字, 没有问题时为空串.
 */
function describeProblem(
  problem: RestoreProblem | undefined,
  translate: TFunction,
): string {
  if (problem === undefined) {
    return "";
  }
  const section = translate(`restore.problem.section.${problem.section}`);
  const code = translate(`restore.problem.code.${problem.code}`);
  return problem.position === undefined
    ? translate("restore.problem.withoutPosition", { section, code })
    : translate("restore.problem.withPosition", {
        section,
        position: problem.position,
        code,
      });
}

/**
 * 把恢复失败的结果翻译成给用户看的文案: 内容不合规与超过上限的失败写出第一个问题.
 * @param failure 失败结果.
 * @param translate 翻译函数.
 * @returns 失败文案.
 */
export function describeRestoreBackupFailure(
  failure: RestoreFailure,
  translate: TFunction,
): string {
  return translate(FAILURE_MESSAGE_KEYS[failure.reason], {
    problem: describeProblem(failure.problem, translate),
  });
}
