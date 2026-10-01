import {
  MASTER_PASSWORD_MIN_LENGTH,
  isMasterPasswordLongEnough,
} from "@shared/vault/master-password-policy";
import type { TFunction } from "i18next";
import { z } from "zod";

/**
 * 引导表单的校验方案: 主密码够长, 两次输入一致, 并已勾选 "我已了解". 校验消息是错误代码
 * (`tooShort`, `mismatch`, `notAcknowledged`), 显示时再换成当前语言的文案.
 */
export const onboardingSchema = z
  .object({
    password: z
      .string()
      .refine(isMasterPasswordLongEnough, { message: "tooShort" }),
    confirmation: z.string(),
    acknowledged: z.boolean(),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ["confirmation"],
    message: "mismatch",
  })
  .refine((values) => values.acknowledged, {
    path: ["acknowledged"],
    message: "notAcknowledged",
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
  switch (code) {
    case "tooShort":
      return translate("vault.onboarding.error.tooShort", {
        minLength: MASTER_PASSWORD_MIN_LENGTH,
      });
    case "mismatch":
      return translate("vault.onboarding.error.mismatch");
    case "notAcknowledged":
      return translate("vault.onboarding.error.notAcknowledged");
    default:
      return undefined;
  }
}
