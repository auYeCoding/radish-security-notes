import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import {
  describeOnboardingError,
  onboardingSchema,
  type OnboardingFormValues,
} from "./onboarding-schema";

/**
 * 一份通过校验的表单取值.
 */
const VALID_VALUES: OnboardingFormValues = {
  password: "long enough 1",
  confirmation: "long enough 1",
  acknowledged: true,
};

/**
 * 校验表单取值并收集全部错误消息.
 * @param values 表单取值.
 * @returns 错误消息列表, 通过时为空.
 */
function collectMessages(values: OnboardingFormValues): string[] {
  const result = onboardingSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
}

describe("onboardingSchema", () => {
  it("取值合法时通过", () => {
    expect(onboardingSchema.safeParse(VALID_VALUES).success).toBe(true);
  });

  it("主密码太短, 两次不一致且未勾选时三项错误一次全部给出", () => {
    const messages = collectMessages({
      password: "short",
      confirmation: "different",
      acknowledged: false,
    });

    expect(messages.sort()).toEqual([
      "mismatch",
      "notAcknowledged",
      "tooShort",
    ]);
  });
});

describe("describeOnboardingError", () => {
  it("把错误代码换成当前语言的文案, 不认识的代码返回 undefined", async () => {
    const i18n = await createI18nInstance({
      language: "zh",
      isPseudoLocalizationEnabled: false,
    });

    expect(describeOnboardingError("tooShort", i18n.t)).toBe(
      "主密码至少需要 8 个字符.",
    );
    expect(describeOnboardingError("mismatch", i18n.t)).toBe(
      "两次输入的主密码不一致.",
    );
    expect(describeOnboardingError(undefined, i18n.t)).toBeUndefined();
    expect(describeOnboardingError("other", i18n.t)).toBeUndefined();
  });
});
