import type { i18n } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

import { describeLockFailure } from "./describe-lock-failure";

/**
 * 锁定可能收到的全部失败原因: 两个专有原因, 状态不符, 以及其它不会专门说明的原因.
 */
const LOCK_FAILURE_REASONS: readonly VaultFailureReason[] = [
  "tasks-running",
  "master-password-required",
  "unexpected-state",
  "unexpected-error",
];

describe.each(["zh", "en"] as const)("锁定失败文案: %s", (language) => {
  let instance: i18n;
  beforeAll(async () => {
    instance = await createI18nInstance({
      language,
      isPseudoLocalizationEnabled: false,
    });
  });

  it("每个失败原因都有文案, 不是键本身, 没有留下占位符", () => {
    for (const reason of LOCK_FAILURE_REASONS) {
      const text = describeLockFailure(reason, instance.t);
      expect(text).not.toBe("");
      expect(text).not.toContain("vault.lock");
      expect(text).not.toMatch(/[{}]/);
    }
  });

  it("各专有原因的文案互不相同, 任务进行中的文案提示等待或取消", () => {
    const texts = LOCK_FAILURE_REASONS.map((reason) =>
      describeLockFailure(reason, instance.t),
    );

    expect(new Set(texts).size).toBe(LOCK_FAILURE_REASONS.length);
    expect(describeLockFailure("tasks-running", instance.t)).toMatch(
      language === "zh" ? /等它结束|取消/ : /finish|cancel/,
    );
  });

  it("未设主密码的文案与按钮不可用时的提示一致", () => {
    expect(describeLockFailure("master-password-required", instance.t)).toBe(
      instance.t("vault.lock.unavailable"),
    );
  });
});
