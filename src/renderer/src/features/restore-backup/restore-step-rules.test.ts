import { describe, expect, it } from "vitest";

import type { RestorePreview } from "@shared/restore/restore-types";

import {
  FAKE_FILLED_RESTORE_VAULT,
  FAKE_RESTORE_PREVIEW,
} from "@renderer/testing/fake-restore-bridge";

import type {
  PassphraseStepState,
  PreviewStepState,
} from "./restore-flow-state";
import {
  buildRestoreRunRequest,
  canConfirmRestore,
  canSubmitPassphrase,
} from "./restore-step-rules";

/**
 * 创建预览步骤的状态.
 * @param previewChanges 备份概要里要改动的字段.
 * @param stateChanges 状态里要改动的字段.
 * @returns 预览步骤的状态.
 */
function createPreviewState(
  previewChanges: Partial<RestorePreview> = {},
  stateChanges: Partial<PreviewStepState> = {},
): PreviewStepState {
  return {
    step: "preview",
    preview: { ...FAKE_RESTORE_PREVIEW, ...previewChanges },
    masterPassword: "",
    hasAcknowledgedReplace: false,
    isMasterPasswordWrong: false,
    ...stateChanges,
  };
}

/**
 * 创建输入口令步骤的状态.
 * @param passphrase 已输入的口令.
 * @returns 输入口令步骤的状态.
 */
function createPassphraseState(passphrase: string): PassphraseStepState {
  return {
    step: "passphrase",
    fileSizeBytes: 1,
    passphrase,
    isPassphraseWrong: false,
  };
}

describe("恢复步骤的规则: 提交口令", () => {
  it("口令为空时不能提交, 有口令才能提交", () => {
    expect(canSubmitPassphrase(createPassphraseState(""))).toBe(false);
    expect(canSubmitPassphrase(createPassphraseState("a"))).toBe(true);
  });
});

describe("恢复步骤的规则: 能否开始恢复", () => {
  it("保险库为空且没设主密码时可以直接开始", () => {
    expect(canConfirmRestore(createPreviewState())).toBe(true);
  });

  it("保险库非空时必须勾选清空确认", () => {
    const filled = { vault: FAKE_FILLED_RESTORE_VAULT };
    expect(canConfirmRestore(createPreviewState(filled))).toBe(false);
    expect(
      canConfirmRestore(
        createPreviewState(filled, { hasAcknowledgedReplace: true }),
      ),
    ).toBe(true);
  });

  it("设了主密码时必须填了主密码", () => {
    const protectedPreview = { requiresMasterPassword: true };
    expect(canConfirmRestore(createPreviewState(protectedPreview))).toBe(false);
    expect(
      canConfirmRestore(
        createPreviewState(protectedPreview, { masterPassword: "m" }),
      ),
    ).toBe(true);
  });

  it("保险库非空且设了主密码时两个条件都要满足", () => {
    const both = {
      vault: FAKE_FILLED_RESTORE_VAULT,
      requiresMasterPassword: true,
    };
    expect(
      canConfirmRestore(
        createPreviewState(both, { hasAcknowledgedReplace: true }),
      ),
    ).toBe(false);
    expect(
      canConfirmRestore(createPreviewState(both, { masterPassword: "m" })),
    ).toBe(false);
    expect(
      canConfirmRestore(
        createPreviewState(both, {
          hasAcknowledgedReplace: true,
          masterPassword: "m",
        }),
      ),
    ).toBe(true);
  });
});

describe("恢复步骤的规则: 恢复请求", () => {
  it("保险库为空且没设主密码时只带清空确认 false, 不带主密码", () => {
    const request = buildRestoreRunRequest(createPreviewState());
    expect(request).toEqual({ acknowledgesReplace: false });
    expect(request).not.toHaveProperty("masterPassword");
  });

  it("勾选了清空确认且设了主密码时两项都带上", () => {
    const state = createPreviewState(
      { vault: FAKE_FILLED_RESTORE_VAULT, requiresMasterPassword: true },
      { hasAcknowledgedReplace: true, masterPassword: "my-master" },
    );
    expect(buildRestoreRunRequest(state)).toEqual({
      acknowledgesReplace: true,
      masterPassword: "my-master",
    });
  });

  it("没设主密码时不带主密码, 即使状态里有残留的输入", () => {
    const state = createPreviewState({}, { masterPassword: "leftover" });
    expect(buildRestoreRunRequest(state)).not.toHaveProperty("masterPassword");
  });
});
