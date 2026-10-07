import { afterEach, describe, expect, it, vi } from "vitest";

import { createSwitchRig } from "../testing/master-password-switch-rig";
import { createViewer } from "../testing/recovery-key-viewer-rig";
import type { ProtectionMode } from "../testing/recovery-vault-fixtures";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import * as recoveryPhrase from "./recovery-phrase";

/**
 * 与测试主密码不同的另一个主密码.
 */
const OTHER_PASSWORD = "another strong password";

/**
 * 两种保护方式与各自查看时要给出的主密码.
 */
const MODES: readonly (readonly [ProtectionMode, string | undefined])[] = [
  ["master-password", TEST_MASTER_PASSWORD],
  ["system", undefined],
];

describe.each(MODES)("RecoveryKeyViewer 成功: %s", (mode, password) => {
  const getHarness = useVaultServiceHarness();

  it("得到的词与首次由同一数据密钥编码的词相同", async () => {
    const rig = await createSwitchRig(getHarness(), { mode });
    const { viewer, failures } = createViewer(rig);

    const result = await viewer.view(password);

    expect(result).toEqual({ ok: true, recoveryWords: rig.recoveryWords });
    expect(failures).toHaveLength(0);
  });

  it("词经现有恢复逻辑还原出同一个数据密钥", async () => {
    const rig = await createSwitchRig(getHarness(), { mode });
    const result = await createViewer(rig).viewer.view(password);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const restored = recoveryPhrase.recoveryWordsToDataKey(
        result.recoveryWords,
      );
      expect(restored.equals(rig.dataKey)).toBe(true);
    }
  });

  it("连续查看两次得到同样的词, 密钥文件不变", async () => {
    const rig = await createSwitchRig(getHarness(), { mode });
    const { viewer } = createViewer(rig);
    const before = await rig.keyFileStore.read();

    const first = await viewer.view(password);
    const second = await viewer.view(password);

    expect(second).toEqual(first);
    expect(await rig.keyFileStore.read()).toEqual(before);
  });
});

describe("RecoveryKeyViewer 系统保护忽略主密码", () => {
  const getHarness = useVaultServiceHarness();

  it("系统保护时给出了主密码也照常查看", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });

    const result = await createViewer(rig).viewer.view(OTHER_PASSWORD);

    expect(result).toEqual({ ok: true, recoveryWords: rig.recoveryWords });
  });
});

describe.each(MODES)("RecoveryKeyViewer 数据密钥清零: %s", (mode, password) => {
  const getHarness = useVaultServiceHarness();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("编码时收到的数据密钥缓冲区用后已清零", async () => {
    const rig = await createSwitchRig(getHarness(), { mode });
    const encode = vi.spyOn(recoveryPhrase, "dataKeyToRecoveryWords");

    await createViewer(rig).viewer.view(password);

    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode.mock.calls[0]?.[0]?.every((byte) => byte === 0)).toBe(true);
  });

  it("编码意外失败时数据密钥缓冲区也已清零, 返回意外失败", async () => {
    const rig = await createSwitchRig(getHarness(), { mode });
    const encode = vi
      .spyOn(recoveryPhrase, "dataKeyToRecoveryWords")
      .mockImplementationOnce(() => {
        throw new Error("编码失败");
      });
    const { viewer, failures } = createViewer(rig);

    const result = await viewer.view(password);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(failures).toHaveLength(1);
    expect(encode.mock.calls[0]?.[0]?.every((byte) => byte === 0)).toBe(true);
  });
});
