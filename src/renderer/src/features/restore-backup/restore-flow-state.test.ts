import { describe, expect, it } from "vitest";

import type { RestoreProblem } from "@shared/restore/restore-problem";
import {
  restoreFailed,
  restoreSucceeded,
} from "@shared/restore/restore-result";

import {
  FAKE_FILLED_RESTORE_VAULT,
  FAKE_RESTORE_OUTCOME,
  FAKE_RESTORE_PREVIEW,
} from "@renderer/testing/fake-restore-bridge";

import {
  INITIAL_RESTORE_FLOW_STATE,
  applyChooseResult,
  applyPassphraseResult,
  applyRunResult,
  backToPick,
  changeAcknowledgedReplace,
  changeMasterPassword,
  changePassphrase,
  startChoosing,
  startDecrypting,
  startRestoring,
  type RestoreFlowState,
} from "./restore-flow-state";

/**
 * 备份已就绪的选择文件结果.
 */
const READY_OUTCOME = restoreSucceeded({
  status: "ready" as const,
  preview: FAKE_RESTORE_PREVIEW,
});

/**
 * 需要口令的选择文件结果.
 */
const NEEDS_PASSPHRASE_OUTCOME = restoreSucceeded({
  status: "needs-passphrase" as const,
  fileSizeBytes: 2048,
});

/**
 * 校验发现的第一个问题.
 */
const PROBLEM: RestoreProblem = {
  section: "entries",
  code: "duplicate-id",
  position: 3,
};

/**
 * 走到预览步骤的状态.
 * @returns 预览步骤的状态.
 */
function previewState(): RestoreFlowState {
  return applyChooseResult(
    startChoosing(INITIAL_RESTORE_FLOW_STATE),
    READY_OUTCOME,
  );
}

/**
 * 走到输入口令步骤的状态.
 * @returns 输入口令步骤的状态.
 */
function passphraseState(): RestoreFlowState {
  return applyChooseResult(
    startChoosing(INITIAL_RESTORE_FLOW_STATE),
    NEEDS_PASSPHRASE_OUTCOME,
  );
}

describe("恢复流程状态: 选择文件", () => {
  it("开始选择后进入处理中, 已就绪进入预览, 主密码, 勾选与错误标记取初始值", () => {
    expect(startChoosing(INITIAL_RESTORE_FLOW_STATE)).toEqual({
      step: "working",
      task: "choosing",
    });
    expect(previewState()).toEqual({
      step: "preview",
      preview: FAKE_RESTORE_PREVIEW,
      masterPassword: "",
      hasAcknowledgedReplace: false,
      isMasterPasswordWrong: false,
    });
  });

  it("需要口令进入输入口令, 带文件大小, 口令为空且没有错误标记", () => {
    expect(passphraseState()).toEqual({
      step: "passphrase",
      fileSizeBytes: 2048,
      passphrase: "",
      isPassphraseWrong: false,
    });
  });

  it("取消回到选择文件, 失败进入失败步骤并带上原因与问题", () => {
    const choosing = startChoosing(INITIAL_RESTORE_FLOW_STATE);
    expect(
      applyChooseResult(
        choosing,
        restoreSucceeded({ status: "cancelled" as const }),
      ),
    ).toEqual(INITIAL_RESTORE_FLOW_STATE);
    expect(
      applyChooseResult(choosing, restoreFailed("invalid-content", PROBLEM)),
    ).toEqual({
      step: "failure",
      failure: { ok: false, reason: "invalid-content", problem: PROBLEM },
    });
  });

  it("只有选择文件的步骤能开始选择", () => {
    expect(startChoosing(previewState())).toEqual(previewState());
  });
});

describe("恢复流程状态: 输入口令", () => {
  it("改动口令只在输入口令步骤生效", () => {
    expect(changePassphrase(passphraseState(), "secret")).toMatchObject({
      step: "passphrase",
      passphrase: "secret",
    });
    expect(changePassphrase(previewState(), "secret")).toEqual(previewState());
  });

  it("开始解密后口令不再留在状态里", () => {
    const typed = changePassphrase(passphraseState(), "secret");
    const decrypting = startDecrypting(typed);
    expect(decrypting).toEqual({
      step: "working",
      task: "decrypting",
      fileSizeBytes: 2048,
    });
    expect(JSON.stringify(decrypting)).not.toContain("secret");
  });
});

describe("恢复流程状态: 提交口令的结果", () => {
  it("口令不对回到输入口令, 口令清空并带错误标记, 再改动口令错误标记作废", () => {
    const decrypting = startDecrypting(
      changePassphrase(passphraseState(), "wrong"),
    );
    const retry = applyPassphraseResult(
      decrypting,
      restoreFailed("wrong-passphrase"),
    );
    expect(retry).toEqual({
      step: "passphrase",
      fileSizeBytes: 2048,
      passphrase: "",
      isPassphraseWrong: true,
    });
    expect(changePassphrase(retry, "x")).toMatchObject({
      passphrase: "x",
      isPassphraseWrong: false,
    });
  });

  it("其它失败进入失败步骤, 成功进入预览", () => {
    const decrypting = startDecrypting(
      changePassphrase(passphraseState(), "right"),
    );
    expect(
      applyPassphraseResult(decrypting, restoreFailed("damaged-file")),
    ).toEqual({
      step: "failure",
      failure: { ok: false, reason: "damaged-file" },
    });
    expect(applyPassphraseResult(decrypting, READY_OUTCOME)).toMatchObject({
      step: "preview",
      preview: FAKE_RESTORE_PREVIEW,
    });
  });
});

describe("恢复流程状态: 预览", () => {
  it("改动主密码与勾选只在预览步骤生效", () => {
    const typed = changeMasterPassword(previewState(), "master");
    const checked = changeAcknowledgedReplace(typed, true);
    expect(checked).toMatchObject({
      masterPassword: "master",
      hasAcknowledgedReplace: true,
    });
    expect(changeMasterPassword(passphraseState(), "master")).toEqual(
      passphraseState(),
    );
    expect(changeAcknowledgedReplace(passphraseState(), true)).toEqual(
      passphraseState(),
    );
  });

  it("保险库里已有内容的备份概要原样保留在状态里", () => {
    const state = applyChooseResult(
      startChoosing(INITIAL_RESTORE_FLOW_STATE),
      restoreSucceeded({
        status: "ready" as const,
        preview: { ...FAKE_RESTORE_PREVIEW, vault: FAKE_FILLED_RESTORE_VAULT },
      }),
    );
    expect(state).toMatchObject({
      preview: { vault: FAKE_FILLED_RESTORE_VAULT },
    });
  });
});

describe("恢复流程状态: 确认恢复", () => {
  it("开始恢复后主密码不再留在状态里, 成功进入结果页", () => {
    const ready = changeAcknowledgedReplace(
      changeMasterPassword(previewState(), "master"),
      true,
    );
    const restoring = startRestoring(ready);
    expect(restoring).toEqual({
      step: "working",
      task: "restoring",
      preview: FAKE_RESTORE_PREVIEW,
      hasAcknowledgedReplace: true,
    });
    expect(JSON.stringify(restoring)).not.toContain("master");
    expect(
      applyRunResult(restoring, restoreSucceeded(FAKE_RESTORE_OUTCOME)),
    ).toEqual({ step: "result", outcome: FAKE_RESTORE_OUTCOME });
  });
});

describe("恢复流程状态: 确认恢复的失败", () => {
  it("主密码不对回到预览, 主密码清空并带错误标记, 勾选保留, 备份概要不变", () => {
    const restoring = startRestoring(
      changeAcknowledgedReplace(
        changeMasterPassword(previewState(), "wrong"),
        true,
      ),
    );
    const retry = applyRunResult(
      restoring,
      restoreFailed("wrong-master-password"),
    );
    expect(retry).toEqual({
      step: "preview",
      preview: FAKE_RESTORE_PREVIEW,
      masterPassword: "",
      hasAcknowledgedReplace: true,
      isMasterPasswordWrong: true,
    });
    expect(changeMasterPassword(retry, "x")).toMatchObject({
      masterPassword: "x",
      isMasterPasswordWrong: false,
    });
  });

  it("其它失败进入失败步骤", () => {
    const restoring = startRestoring(previewState());
    expect(
      applyRunResult(restoring, restoreFailed("unexpected-error")),
    ).toEqual({
      step: "failure",
      failure: { ok: false, reason: "unexpected-error" },
    });
  });
});

describe("恢复流程状态: 回到选择文件", () => {
  it("输入口令, 预览与失败的步骤都能回到选择文件", () => {
    const failure = applyChooseResult(
      startChoosing(INITIAL_RESTORE_FLOW_STATE),
      restoreFailed("not-a-backup"),
    );
    expect(backToPick(passphraseState())).toEqual(INITIAL_RESTORE_FLOW_STATE);
    expect(backToPick(previewState())).toEqual(INITIAL_RESTORE_FLOW_STATE);
    expect(backToPick(failure)).toEqual(INITIAL_RESTORE_FLOW_STATE);
  });

  it("处理中与结果页里被忽略", () => {
    const working = startChoosing(INITIAL_RESTORE_FLOW_STATE);
    const result = applyRunResult(
      startRestoring(previewState()),
      restoreSucceeded(FAKE_RESTORE_OUTCOME),
    );
    expect(backToPick(working)).toEqual(working);
    expect(backToPick(result)).toEqual(result);
  });
});

describe("恢复流程状态: 迟到的结果", () => {
  it("不在对应处理中时选择文件, 提交口令与确认恢复的结果都被忽略", () => {
    const state = previewState();
    expect(applyChooseResult(state, READY_OUTCOME)).toEqual(state);
    expect(applyPassphraseResult(state, READY_OUTCOME)).toEqual(state);
    expect(
      applyRunResult(state, restoreSucceeded(FAKE_RESTORE_OUTCOME)),
    ).toEqual(state);
    expect(applyRunResult(state, restoreFailed("busy"))).toEqual(state);
  });

  it("处理的种类不符时结果被忽略", () => {
    const decrypting = startDecrypting(passphraseState());
    expect(applyChooseResult(decrypting, READY_OUTCOME)).toEqual(decrypting);
    expect(
      applyRunResult(decrypting, restoreSucceeded(FAKE_RESTORE_OUTCOME)),
    ).toEqual(decrypting);
  });
});
