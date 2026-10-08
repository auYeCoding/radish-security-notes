import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { VaultFailureInfo } from "@shared/vault/vault-failure";

import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

import { VaultFailureScreen } from "./vault-failure-screen";

/**
 * 在保险库环境里渲染失败页.
 * @param failure 主进程记录的失败信息, 不给时按没有记录处理.
 * @returns 渲染所用的环境.
 */
async function renderFailure(
  failure?: VaultFailureInfo,
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "failed",
    failure,
  });
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

  it("没有失败信息时用通用说明, 不显示诊断信息", async () => {
    await renderFailure();

    expect(screen.queryByText(/诊断信息/)).toBeNull();
    expect(screen.queryByText(/cause=/)).toBeNull();
  });
});

describe("VaultFailureScreen 按失败原因说明", () => {
  it("缺密钥文件: 说明 vault-key.json 不见了, 不会自动新建, 仍可用恢复词", async () => {
    await renderFailure({
      cause: "key-file-missing",
      stage: "startup",
      errorName: undefined,
    });

    expect(
      screen.getByText(/密钥文件 vault-key\.json 不见了.*不会自动新建密钥文件/),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "用恢复词恢复" })).toBeDefined();
    expect(
      screen.getByText("cause=key-file-missing; stage=startup"),
    ).toBeDefined();
  });

  it("缺数据库文件: 说明 vault.db 不见了, 不会自动新建空文件, 恢复词无法替代它", async () => {
    await renderFailure({
      cause: "database-missing",
      stage: "unlock",
      errorName: undefined,
    });

    expect(
      screen.getByText(
        /数据文件 vault\.db 不见了.*不会自动新建空的数据文件.*数据文件不在时无法凭它恢复/,
      ),
    ).toBeDefined();
    expect(
      screen.getByText("cause=database-missing; stage=unlock"),
    ).toBeDefined();
  });
});

describe("VaultFailureScreen 另外两类原因的说明", () => {
  it("数据库打不开: 说明可能已损坏或不配套, 诊断信息带错误类名", async () => {
    await renderFailure({
      cause: "database-unreadable",
      stage: "startup",
      errorName: "DatabaseKeyRejectedError",
    });

    expect(
      screen.getByText(/数据文件打不开.*不要删除 vault 文件夹/),
    ).toBeDefined();
    expect(
      screen.getByText(
        "cause=database-unreadable; stage=startup; error=DatabaseKeyRejectedError",
      ),
    ).toBeDefined();
  });

  it("其它意外失败: 用通用说明, 诊断信息带错误类名", async () => {
    await renderFailure({
      cause: "unexpected",
      stage: "startup",
      errorName: "InvalidKeyRecordError",
    });

    expect(screen.getByText(/如果保存了恢复词, 可以凭它恢复/)).toBeDefined();
    expect(
      screen.getByText(
        "cause=unexpected; stage=startup; error=InvalidKeyRecordError",
      ),
    ).toBeDefined();
  });
});

describe("VaultFailureScreen 复制诊断信息", () => {
  it("点击复制按钮把诊断文本写入剪贴板", async () => {
    const user = userEvent.setup();
    await renderFailure({
      cause: "database-unreadable",
      stage: "unlock",
      errorName: "DatabaseKeyRejectedError",
    });

    await user.click(screen.getByRole("button", { name: "复制诊断信息" }));

    expect(await navigator.clipboard.readText()).toBe(
      "cause=database-unreadable; stage=unlock; error=DatabaseKeyRejectedError",
    );
  });
});
