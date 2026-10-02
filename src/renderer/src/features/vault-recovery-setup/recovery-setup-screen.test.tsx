import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
  type VaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

import { RecoverySetupScreen } from "./recovery-setup-screen";

/**
 * 渲染恢复词页, 先让保险库 store 记下待确认的恢复词, 与真实流程一致.
 * @returns 渲染所用的环境.
 */
async function renderSetupScreen(): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: "needs-setup",
  });
  await environment.vaultStore.getState().setupWithMasterPassword("password-1");
  render(<RecoverySetupScreen words={TEST_RECOVERY_WORDS} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

/**
 * 点击 "我已保存, 继续" 进入确认步骤.
 */
async function continueToConfirmation(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "我已保存, 继续" }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RecoverySetupScreen 展示步骤", () => {
  it("显示标题, 警示语与带序号的 24 个词", async () => {
    await renderSetupScreen();

    expect(
      screen.getByRole("heading", { name: "保存你的恢复词" }),
    ).toBeDefined();
    expect(screen.getByRole("note").textContent).toContain("万能钥匙");
    const list = screen.getByRole("list", { name: "24 个恢复词" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(24);
    expect(items[0]?.textContent).toBe("1.abandon");
    expect(items[23]?.textContent).toBe("24.actual");
  });

  it("没有复制到剪贴板的入口, 并说明原因", async () => {
    await renderSetupScreen();

    expect(screen.queryByRole("button", { name: /复制|copy/i })).toBeNull();
    expect(
      screen.getByText("为避免被其它程序读取, 这里不提供复制到剪贴板."),
    ).toBeDefined();
  });

  it("提供打印恢复套件与保存为文本文件两个按钮, 并常驻明文警告", async () => {
    await renderSetupScreen();

    expect(screen.getByRole("button", { name: "打印恢复套件" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "保存为文本文件" }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "文本文件是明文, 同步工具, 备份与云盘都会把它带走, 请保存到不会被同步的位置.",
      ),
    ).toBeDefined();
  });
});

describe("RecoverySetupScreen 确认步骤", () => {
  it("进入确认步骤后词被隐藏, 要求重输随机抽出的 3 个词", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    await renderSetupScreen();

    await continueToConfirmation();

    expect(screen.getByRole("heading", { name: "确认恢复词" })).toBeDefined();
    expect(
      screen.getByText("输入你保存的第 1, 2, 3 个词, 确认已正确保存."),
    ).toBeDefined();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    expect(screen.getByLabelText("第 1 个词")).toBeDefined();
    expect(screen.getByLabelText("第 3 个词")).toBeDefined();
  });

  it("答错时指出哪个位置不对, 不显示正确的词, 不进入主界面", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { vaultStore } = await renderSetupScreen();
    await continueToConfirmation();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("第 1 个词"), "abandon");
    await user.type(screen.getByLabelText("第 2 个词"), "wrong");
    await user.type(screen.getByLabelText("第 3 个词"), "able");
    await user.click(screen.getByRole("button", { name: "确认" }));

    expect(
      await screen.findByText("第 2 个词不正确, 请对照你保存的副本."),
    ).toBeDefined();
    expect(screen.queryByText(/第 1 个词不正确/)).toBeNull();
    expect(screen.queryByText("ability")).toBeNull();
    expect(vaultStore.getState().pendingRecoveryWords).toEqual(
      TEST_RECOVERY_WORDS,
    );
  });
});

describe("RecoverySetupScreen 确认通过与返回", () => {
  it("全部答对 (忽略大小写与空白) 后丢弃待确认的恢复词", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { vaultStore } = await renderSetupScreen();
    await continueToConfirmation();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("第 1 个词"), " ABANDON ");
    await user.type(screen.getByLabelText("第 2 个词"), "ability");
    await user.type(screen.getByLabelText("第 3 个词"), "able");
    await user.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(vaultStore.getState().pendingRecoveryWords).toBeUndefined();
    });
    expect(vaultStore.getState().status).toBe("unlocked");
  });

  it("返回再看一遍回到展示步骤, 再次进入时重新抽取位置", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    await renderSetupScreen();
    await continueToConfirmation();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "返回再看一遍" }));
    expect(screen.getByRole("list", { name: "24 个恢复词" })).toBeDefined();
    random.mockReturnValue(0.999);

    await continueToConfirmation();

    expect(screen.getByLabelText("第 22 个词")).toBeDefined();
    expect(screen.getByLabelText("第 24 个词")).toBeDefined();
  });
});
