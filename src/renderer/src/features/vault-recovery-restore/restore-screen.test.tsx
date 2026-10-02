import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
  type VaultTestEnvironment,
  type VaultTestEnvironmentOptions,
} from "@renderer/testing/vault-test-environment";

import { RestoreScreen } from "./restore-screen";

/**
 * 在保险库环境里渲染恢复页.
 * @param options 保险库测试环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderRestore(
  options: VaultTestEnvironmentOptions = {},
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "locked",
    ...options,
  });
  environment.vaultStore.getState().requestRestore();
  render(<RestoreScreen />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 在第一个输入框粘贴整串恢复词.
 * @param words 要粘贴的词.
 */
async function pasteWords(words: readonly string[]): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("第 1 个词"));
  await user.paste(words.join(" "));
}

/**
 * 粘贴整串恢复词并点击 "验证恢复词".
 * @param words 要验证的词.
 */
async function verifyWords(words: readonly string[]): Promise<void> {
  await pasteWords(words);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "验证恢复词" }));
}

describe("RestoreScreen 输入恢复词", () => {
  it("显示标题, 说明与 24 个带序号的输入框, 第一个输入框获得焦点", async () => {
    await renderRestore();

    expect(screen.getByRole("heading", { name: "用恢复词恢复" })).toBeDefined();
    expect(screen.getAllByRole("textbox")).toHaveLength(24);
    expect(screen.getByLabelText("第 24 个词")).toBeDefined();
    expect(
      screen.getByText("可以把 24 个词一次粘贴到任意一个输入框."),
    ).toBeDefined();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("第 1 个词"));
    });
  });

  it("在一个输入框粘贴整串词时分发到全部输入框", async () => {
    await renderRestore();

    await pasteWords(TEST_RECOVERY_WORDS);

    const values = screen
      .getAllByRole("textbox")
      .map((box) => (box as HTMLInputElement).value);
    expect(values).toEqual([...TEST_RECOVERY_WORDS]);
  });

  it("点击返回回到解锁页或失败页, 不调用桥", async () => {
    const { vaultStore, recoveryBridge } = await renderRestore();

    await userEvent.setup().click(screen.getByRole("button", { name: "返回" }));

    expect(vaultStore.getState().isRestoreRequested).toBe(false);
    expect(recoveryBridge.verifyWords).not.toHaveBeenCalled();
  });
});

describe("RestoreScreen 校验恢复词", () => {
  it("提交后把 24 个词交给桥校验, 通过后进入设置新保护步骤", async () => {
    const { recoveryBridge } = await renderRestore();

    await verifyWords(TEST_RECOVERY_WORDS);

    expect(
      await screen.findByRole("heading", { name: "设置新的保护" }),
    ).toBeDefined();
    expect(recoveryBridge.verifyWords).toHaveBeenCalledWith([
      ...TEST_RECOVERY_WORDS,
    ]);
  });

  it("词不在词表时指出第几个词并把那个输入框标红", async () => {
    await renderRestore({
      recoveryBridgeOverrides: {
        verifyWords: () =>
          Promise.resolve({
            ok: false,
            reason: "recovery-unknown-word",
            wordPosition: 5,
          }),
      },
    });

    await verifyWords(TEST_RECOVERY_WORDS);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "第 5 个词不在词表中, 请检查拼写.",
    );
    expect(
      screen.getByLabelText("第 5 个词").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      screen.getByLabelText("第 4 个词").getAttribute("aria-invalid"),
    ).toBe("false");
  });
});

describe("RestoreScreen 校验被拒绝的其它原因", () => {
  it("校验和不通过与数据库打不开分别给出提示, 停留在输入步骤", async () => {
    const { recoveryBridge } = await renderRestore({
      recoveryBridgeOverrides: {
        verifyWords: () =>
          Promise.resolve({ ok: false, reason: "recovery-checksum" }),
      },
    });
    await verifyWords(TEST_RECOVERY_WORDS);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "词的拼写或顺序有误, 请逐个核对.",
    );

    recoveryBridge.verifyWords = () =>
      Promise.resolve({ ok: false, reason: "recovery-key-rejected" });
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "验证恢复词" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("不匹配");
    });
    expect(screen.queryByRole("heading", { name: "设置新的保护" })).toBeNull();
  });
});
