import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

import { VaultFailureScreen } from "./vault-failure-screen";

/**
 * 在保险库环境里渲染失败页.
 * @returns 渲染所用的环境.
 */
async function renderFailure(): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({ status: "failed" });
  render(<VaultFailureScreen />, { wrapper: environment.Providers });
  return environment;
}

describe("VaultFailureScreen", () => {
  it("说明原因与下一步, 提到可以凭恢复词恢复", async () => {
    await renderFailure();

    expect(screen.getByRole("heading", { name: "无法打开数据" })).toBeDefined();
    expect(screen.getByText(/如果保存了恢复词, 可以凭它恢复/)).toBeDefined();
  });

  it("有 用恢复词恢复 入口, 点击后进入恢复流程, 状态仍是 failed", async () => {
    const { vaultStore } = await renderFailure();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "用恢复词恢复" }));

    expect(vaultStore.getState().isRestoreRequested).toBe(true);
    expect(vaultStore.getState().status).toBe("failed");
  });
});
