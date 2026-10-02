import { describe, expect, it } from "vitest";

import { DEFAULT_GATE_FRAME_LAYOUT } from "@renderer/components/gate-frame-layout";
import type { VaultStatus } from "@shared/vault/vault-status";

import { selectGateScreen, type GateScreenInput } from "./select-gate-screen";

/**
 * 按状态组装选页输入, 没有待确认的恢复词, 没有请求恢复.
 * @param status 保险库状态.
 * @param overrides 要覆盖的输入字段.
 * @returns 选页输入.
 */
function inputFor(
  status: VaultStatus,
  overrides: Partial<GateScreenInput> = {},
): GateScreenInput {
  return {
    status,
    pendingRecoveryWords: undefined,
    isRestoreRequested: false,
    ...overrides,
  };
}

describe("selectGateScreen 外框版式", () => {
  it.each<VaultStatus>(["needs-setup", "locked", "failed"])(
    "%s 的页面沿用恢复功能加入之前的外框版式, 即默认版式",
    (status) => {
      expect(selectGateScreen(inputFor(status))?.layout).toEqual(
        DEFAULT_GATE_FRAME_LAYOUT,
      );
    },
  );

  it.each<VaultStatus>(["locked", "failed"])(
    "%s 时请求恢复, 恢复页上下留宽但不打印",
    (status) => {
      const selection = selectGateScreen(
        inputFor(status, { isRestoreRequested: true }),
      );

      expect(selection?.layout).toEqual({
        spacing: "roomy",
        isPrintKit: false,
      });
    },
  );

  it("有待确认的恢复词时, 恢复词页上下留宽并带打印套件", () => {
    const selection = selectGateScreen(
      inputFor("unlocked", { pendingRecoveryWords: ["word"] }),
    );

    expect(selection?.layout).toEqual({ spacing: "roomy", isPrintKit: true });
  });

  it("已解锁且没有待确认的恢复词时不选页面", () => {
    expect(selectGateScreen(inputFor("unlocked"))).toBeUndefined();
  });
});
