import type { TFunction } from "i18next";

import type {
  EmailBackupField,
  EmailBackupFieldProblem,
  EmailBackupFieldProblemKind,
} from "@shared/email-backup/email-backup-settings-rules";

/**
 * 每种字段问题对应的文案键.
 */
const PROBLEM_MESSAGE_KEYS = {
  required: "emailBackup.error.required",
  invalid: "emailBackup.error.invalid",
  "out-of-range": "emailBackup.error.outOfRange",
} as const satisfies Record<EmailBackupFieldProblemKind, string>;

/**
 * 取一个字段要显示的错误文案. 字段还是空的时候不提示, 用户开始填写之后才提示, 避免一打开对话框
 * 就满屏报错.
 * @param problems 全部字段问题.
 * @param field 要取错误的字段.
 * @param value 字段现在的内容.
 * @param translate 翻译函数.
 * @returns 错误文案, 没有问题或字段还是空的时为 undefined.
 */
export function fieldErrorOf(
  problems: readonly EmailBackupFieldProblem[],
  field: EmailBackupField,
  value: string,
  translate: TFunction,
): string | undefined {
  const problem = problems.find((candidate) => candidate.field === field);
  if (problem === undefined || value === "") {
    return undefined;
  }
  return translate(PROBLEM_MESSAGE_KEYS[problem.kind]);
}
