import { describeNewPasswordError } from "@renderer/components/new-password-error";
import {
  PASSWORD_MISMATCH_ISSUE,
  isPasswordConfirmed,
  newPasswordShape,
} from "@shared/vault/new-password-rules";
import type { TFunction } from "i18next";
import { z } from "zod";

/**
 * 引导表单自己的校验错误代码, 新主密码字段的错误代码在 `new-password-rules` 中定义.
 */
const NOT_ACKNOWLEDGED_ERROR_CODE = "notAcknowledged";

/**
 * 引导表单的校验方案: 主密码够长, 两次输入一致, 并已勾选 "我已了解". 校验消息是错误代码,
 * 显示时再换成当前语言的文案.
 */
export const onboardingSchema = z
  .object({
    ...newPasswordShape,
    acknowledged: z.boolean(),
  })
  .refine(isPasswordConfirmed, PASSWORD_MISMATCH_ISSUE)
  .refine((values) => values.acknowledged, {
    path: ["acknowledged"],
    message: NOT_ACKNOWLEDGED_ERROR_CODE,
  });

/**
 * 引导表单的取值.
 */
export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

/**
 * 把校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由 `onboardingSchema` 产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeOnboardingError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  if (code === NOT_ACKNOWLEDGED_ERROR_CODE) {
    return translate("vault.onboarding.error.notAcknowledged");
  }
  return describeNewPasswordError(code, translate);
}
