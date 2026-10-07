import { describe, expect, it, vi } from "vitest";

import { createSwitchRig } from "../testing/master-password-switch-rig";
import { createViewer } from "../testing/recovery-key-viewer-rig";
import type { ProtectionMode } from "../testing/recovery-vault-fixtures";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import {
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";

/**
 * 与测试主密码不同的另一个主密码.
 */
const OTHER_PASSWORD = "another strong password";

describe("RecoveryKeyViewer 主密码验证", () => {
  const getHarness = useVaultServiceHarness();

  it("主密码错误时失败, 不带词, 密钥文件原样, 不触发失败回调", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });
    const { viewer, failures } = createViewer(rig);
    const before = await rig.keyFileStore.read();

    const result = await viewer.view(OTHER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(failures).toHaveLength(0);
  });

  it("设了主密码却没有给出主密码时按状态不符拒绝", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });
    const { viewer, failures } = createViewer(rig);

    const result = await viewer.view(undefined);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(failures).toHaveLength(0);
  });
});

describe.each<ProtectionMode>(["master-password", "system"])(
  "RecoveryKeyViewer 状态不符与意外失败: %s",
  (mode) => {
    const getHarness = useVaultServiceHarness();

    it("保险库没有解锁时按状态不符拒绝, 不读取密钥文件", async () => {
      const rig = await createSwitchRig(getHarness(), { mode });
      const { viewer } = createViewer(rig, { isUnlocked: false });
      const read = vi.spyOn(rig.keyFileStore, "read");

      const result = await viewer.view(TEST_MASTER_PASSWORD);

      expect(result).toEqual({ ok: false, reason: "unexpected-state" });
      expect(read).not.toHaveBeenCalled();
    });

    it("读取密钥文件失败时返回意外失败, 只通知一次回调, 之后可以重试", async () => {
      const rig = await createSwitchRig(getHarness(), { mode });
      const { viewer, failures } = createViewer(rig);
      vi.spyOn(rig.keyFileStore, "read").mockRejectedValueOnce(
        new Error("磁盘读取失败"),
      );

      const failed = await viewer.view(TEST_MASTER_PASSWORD);
      const retried = await viewer.view(TEST_MASTER_PASSWORD);

      expect(failed).toEqual({ ok: false, reason: "unexpected-error" });
      expect(failures).toHaveLength(1);
      expect(retried).toEqual({ ok: true, recoveryWords: rig.recoveryWords });
    });
  },
);

describe("RecoveryKeyViewer 系统解密失败与并发", () => {
  const getHarness = useVaultServiceHarness();

  it("系统解密失败时返回意外失败, 密钥文件原样", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });
    const { viewer, failures } = createViewer(rig, {
      safeStorage: createFakeSafeStorage({ isDecryptionFailing: true }),
    });
    const before = await rig.keyFileStore.read();

    const result = await viewer.view(undefined);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(failures).toHaveLength(1);
    expect(await rig.keyFileStore.read()).toEqual(before);
  });

  it("同时发起两次查看时, 后发起的按状态不符拒绝", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });
    const { viewer } = createViewer(rig);

    const results = await Promise.all([
      viewer.view(undefined),
      viewer.view(undefined),
    ]);

    expect(results).toEqual([
      { ok: true, recoveryWords: rig.recoveryWords },
      { ok: false, reason: "unexpected-state" },
    ]);
  });

  it("失败回调收到的错误里没有主密码与恢复词", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });
    const { viewer, failures } = createViewer(rig);
    vi.spyOn(rig.keyFileStore, "read").mockRejectedValueOnce(
      new Error("磁盘读取失败"),
    );

    await viewer.view(TEST_MASTER_PASSWORD);

    const reported = JSON.stringify(failures.map(String));
    expect(reported).not.toContain(TEST_MASTER_PASSWORD);
    rig.recoveryWords.forEach((word) => {
      expect(reported).not.toContain(` ${word} `);
    });
  });
});
