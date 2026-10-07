import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "@renderer/testing/vault-test-environment";
import type { RecoveryTextFileStatus } from "@shared/vault/recovery-bridge";

import { RecoverySaveActions } from "./recovery-save-actions";

/**
 * 渲染保存手段按钮区.
 * @param options 保险库测试环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderActions(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment(options);
  render(
    <RecoverySaveActions
      words={TEST_RECOVERY_WORDS}
      onSaveTextFile={environment.recoveryBridge.saveTextFile}
    />,
    { wrapper: environment.Providers },
  );
  return environment;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RecoverySaveActions 打印", () => {
  it("点击打印恢复套件调用页面打印", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await renderActions();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "打印恢复套件" }));

    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("RecoverySaveActions 保存为文本文件", () => {
  it("点击后把 24 个词交给桥, 保存成功后提示", async () => {
    const { recoveryBridge } = await renderActions();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "保存为文本文件" }));

    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("已保存文本文件.");
    expect(recoveryBridge.saveTextFile).toHaveBeenCalledWith(
      TEST_RECOVERY_WORDS,
    );
  });

  it("用户在对话框里取消时没有任何提示", async () => {
    const { recoveryBridge } = await renderActions({
      recoveryBridgeOverrides: {
        saveTextFile: vi.fn(() =>
          Promise.resolve<RecoveryTextFileStatus>("cancelled"),
        ),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "保存为文本文件" }));

    await waitFor(() => {
      expect(recoveryBridge.saveTextFile).toHaveBeenCalledTimes(1);
      expect(
        screen
          .getByRole("button", { name: "保存为文本文件" })
          .hasAttribute("disabled"),
      ).toBe(false);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("RecoverySaveActions 取消失败与处理中", () => {
  it("写入失败或桥抛出错误时提示换一个位置", async () => {
    await renderActions({
      recoveryBridgeOverrides: {
        saveTextFile: () => Promise.reject(new Error("ipc 失败")),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "保存为文本文件" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "无法保存文件. 请换一个位置重试.",
    );
  });

  it("保存进行中按钮被禁用", async () => {
    await renderActions({
      recoveryBridgeOverrides: {
        saveTextFile: () =>
          new Promise<RecoveryTextFileStatus>(() => undefined),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "保存为文本文件" }));

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "保存为文本文件" })
          .hasAttribute("disabled"),
      ).toBe(true);
    });
  });

  it("按钮下方常驻说明明文文件会被同步, 备份与云盘带走", async () => {
    await renderActions();

    expect(
      screen.getByText(
        "文本文件是明文, 同步工具, 备份与云盘都会把它带走, 请保存到不会被同步的位置.",
      ),
    ).toBeDefined();
  });
});
