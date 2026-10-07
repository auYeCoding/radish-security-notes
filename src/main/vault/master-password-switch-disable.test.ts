import { describe, expect, it, vi } from "vitest";

import {
  createSwitchRig,
  isZeroed,
  readProtectedDataKey,
} from "../testing/master-password-switch-rig";
import { NEW_MASTER_PASSWORD } from "../testing/recovery-vault-fixtures";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import {
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { dataKeyToRecoveryWords } from "./recovery-phrase";

describe("MasterPasswordSwitch 关闭主密码: 成功", () => {
  const getHarness = useVaultServiceHarness();

  it("密钥文件改成系统保护, 解出的还是同一个数据密钥", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });

    const result = await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    expect((await rig.keyFileStore.read())?.protection).toBe(
      "system-protected",
    );
    const unwrapped = await readProtectedDataKey(rig, TEST_MASTER_PASSWORD);
    expect(unwrapped.equals(rig.dataKey)).toBe(true);
    expect(dataKeyToRecoveryWords(unwrapped)).toEqual(rig.recoveryWords);
  });

  it("成功后交给写入器的数据密钥缓冲区已清零", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });

    await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(rig.receivedKeys).toHaveLength(1);
    expect(isZeroed(rig.receivedKeys[0])).toBe(true);
  });
});

describe("MasterPasswordSwitch 关闭主密码: 主密码错误与系统保护超时", () => {
  const getHarness = useVaultServiceHarness();

  it("当前主密码错误时失败, 密钥文件原样, 不写任何保护", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.disable(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(rig.receivedKeys).toHaveLength(0);
    expect(rig.failures).toHaveLength(0);
  });

  it("系统密钥等不到落盘时失败, 不写任何文件, 数据密钥缓冲区已清零", async () => {
    const harness = getHarness();
    const rig = await createSwitchRig(harness, {
      mode: "master-password",
      systemKeyPersistence: {
        waitUntilPersisted: () => Promise.resolve(false),
      },
    });
    const before = await rig.keyFileStore.read();
    const write = vi.spyOn(harness.keyFileStore, "write");

    const result = await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(result).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(write).not.toHaveBeenCalled();
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(isZeroed(rig.receivedKeys[0])).toBe(true);
  });
});

describe("MasterPasswordSwitch 关闭主密码: 系统不可用与写入失败", () => {
  const getHarness = useVaultServiceHarness();

  it("系统不能保护数据密钥时失败, 密钥文件原样", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
      safeStorage: createFakeSafeStorage({ isAvailable: false }),
    });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(result).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(await rig.keyFileStore.read()).toEqual(before);
  });

  it("密钥文件写入失败时返回意外失败, 密钥文件原样, 数据密钥缓冲区已清零", async () => {
    const harness = getHarness();
    const rig = await createSwitchRig(harness, { mode: "master-password" });
    const before = await rig.keyFileStore.read();
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValueOnce(
      new Error("磁盘写入失败"),
    );

    const result = await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(rig.failures).toHaveLength(1);
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(isZeroed(rig.receivedKeys[0])).toBe(true);
  });
});

describe("MasterPasswordSwitch 关闭主密码: 状态不符", () => {
  const getHarness = useVaultServiceHarness();

  it("已经是系统保护时按状态不符拒绝, 密钥文件原样", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(await rig.keyFileStore.read()).toEqual(before);
  });

  it("保险库没有解锁时按状态不符拒绝", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
      isUnlocked: false,
    });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(await rig.keyFileStore.read()).toEqual(before);
  });
});

describe("MasterPasswordSwitch 关闭主密码: 并发与错误信息", () => {
  const getHarness = useVaultServiceHarness();

  it("失败回调收到的错误里没有当前主密码", async () => {
    const harness = getHarness();
    const rig = await createSwitchRig(harness, { mode: "master-password" });
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValueOnce(
      new Error("磁盘写入失败"),
    );

    await rig.switcher.disable(TEST_MASTER_PASSWORD);

    expect(JSON.stringify(rig.failures.map(String))).not.toContain(
      TEST_MASTER_PASSWORD,
    );
  });

  it("同时发起两次关闭时, 后发起的按状态不符拒绝", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });

    const results = await Promise.all([
      rig.switcher.disable(TEST_MASTER_PASSWORD),
      rig.switcher.disable(TEST_MASTER_PASSWORD),
    ]);

    expect(results).toEqual([
      { ok: true },
      { ok: false, reason: "unexpected-state" },
    ]);
  });
});
