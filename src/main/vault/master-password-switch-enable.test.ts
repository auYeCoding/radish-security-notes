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

describe("MasterPasswordSwitch 开启主密码: 成功", () => {
  const getHarness = useVaultServiceHarness();

  it("密钥文件改成主密码保护, 新主密码解出的还是同一个数据密钥", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });

    const result = await rig.switcher.enable(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    expect((await rig.keyFileStore.read())?.protection).toBe("master-password");
    const unwrapped = await readProtectedDataKey(rig, NEW_MASTER_PASSWORD);
    expect(unwrapped.equals(rig.dataKey)).toBe(true);
    expect(dataKeyToRecoveryWords(unwrapped)).toEqual(rig.recoveryWords);
  });

  it("成功后交给写入器的数据密钥缓冲区已清零", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });

    await rig.switcher.enable(NEW_MASTER_PASSWORD);

    expect(rig.receivedKeys).toHaveLength(1);
    expect(isZeroed(rig.receivedKeys[0])).toBe(true);
  });
});

describe("MasterPasswordSwitch 开启主密码: 参数与状态不符", () => {
  const getHarness = useVaultServiceHarness();

  it("新主密码太短时失败, 密钥文件原样, 不解出数据密钥", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.enable("short");

    expect(result).toEqual({ ok: false, reason: "password-too-short" });
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(rig.receivedKeys).toHaveLength(0);
  });

  it("已经是主密码保护时按状态不符拒绝, 密钥文件原样", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "master-password",
    });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.enable(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(rig.receivedKeys).toHaveLength(0);
  });

  it("保险库没有解锁时按状态不符拒绝", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "system",
      isUnlocked: false,
    });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.enable(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(await rig.keyFileStore.read()).toEqual(before);
  });
});

describe("MasterPasswordSwitch 开启主密码: 失败注入", () => {
  const getHarness = useVaultServiceHarness();

  it("系统解密失败时返回意外失败并通知回调, 密钥文件原样", async () => {
    const rig = await createSwitchRig(getHarness(), {
      mode: "system",
      safeStorage: createFakeSafeStorage({ isDecryptionFailing: true }),
    });
    const before = await rig.keyFileStore.read();

    const result = await rig.switcher.enable(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(rig.failures).toHaveLength(1);
    expect(await rig.keyFileStore.read()).toEqual(before);
  });

  it("密钥文件写入失败时返回意外失败, 密钥文件原样, 数据密钥缓冲区已清零", async () => {
    const harness = getHarness();
    const rig = await createSwitchRig(harness, { mode: "system" });
    const before = await rig.keyFileStore.read();
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValueOnce(
      new Error("磁盘写入失败"),
    );

    const result = await rig.switcher.enable(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(rig.failures).toHaveLength(1);
    expect(await rig.keyFileStore.read()).toEqual(before);
    expect(isZeroed(rig.receivedKeys[0])).toBe(true);
  });
});

describe("MasterPasswordSwitch 开启主密码: 并发与错误信息", () => {
  const getHarness = useVaultServiceHarness();

  it("失败回调收到的错误里没有新主密码与旧主密码", async () => {
    const harness = getHarness();
    const rig = await createSwitchRig(harness, { mode: "system" });
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValueOnce(
      new Error("磁盘写入失败"),
    );

    await rig.switcher.enable(NEW_MASTER_PASSWORD);

    const text = JSON.stringify(rig.failures.map(String));
    expect(text).not.toContain(NEW_MASTER_PASSWORD);
    expect(text).not.toContain(TEST_MASTER_PASSWORD);
  });

  it("同时发起两次开启时, 后发起的按状态不符拒绝", async () => {
    const rig = await createSwitchRig(getHarness(), { mode: "system" });

    const results = await Promise.all([
      rig.switcher.enable(NEW_MASTER_PASSWORD),
      rig.switcher.enable(NEW_MASTER_PASSWORD),
    ]);

    expect(results).toEqual([
      { ok: true },
      { ok: false, reason: "unexpected-state" },
    ]);
  });
});
