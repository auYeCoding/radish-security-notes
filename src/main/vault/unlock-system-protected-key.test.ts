import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateDataKey } from "./data-key";
import type { KeyFileStore } from "./key-file-store";
import { SYSTEM_PROTECTION, type SystemKeyRecord } from "./key-record";
import type { SafeStoragePort } from "./safe-storage-port";
import { unprotectWithSystem } from "./system-key-protector";
import { unlockSystemProtectedKey } from "./unlock-system-protected-key";

vi.mock("./system-key-protector", () => ({ unprotectWithSystem: vi.fn() }));

/**
 * 测试用的系统保护记录.
 */
const RECORD: SystemKeyRecord = {
  version: 1,
  protection: SYSTEM_PROTECTION,
  wrappedDataKey: "wrapped",
};

/**
 * 测试用的刷新后记录, 系统要求重新加密时给出.
 */
const REFRESHED_RECORD: SystemKeyRecord = {
  ...RECORD,
  wrappedDataKey: "refreshed",
};

/**
 * 假的 safeStorage 接口, 解密由被替换的 `unprotectWithSystem` 完成, 这里不会被调用.
 */
const SAFE_STORAGE = {} as SafeStoragePort;

/**
 * 创建只记录写入调用的假密钥文件存储.
 * @param write 写入函数.
 * @returns 假密钥文件存储.
 */
function createKeyFileStore(write: KeyFileStore["write"]): KeyFileStore {
  return { write } as KeyFileStore;
}

describe("unlockSystemProtectedKey", () => {
  beforeEach(() => {
    vi.mocked(unprotectWithSystem).mockReset();
  });

  it("系统不要求重新加密时不写密钥文件, 原样交出数据密钥", async () => {
    const dataKey = generateDataKey();
    const expected = Buffer.from(dataKey);
    vi.mocked(unprotectWithSystem).mockResolvedValue({
      dataKey,
      refreshedRecord: undefined,
    });
    const write = vi.fn(() => Promise.resolve());

    const result = await unlockSystemProtectedKey(
      RECORD,
      SAFE_STORAGE,
      createKeyFileStore(write),
    );

    expect(result.equals(expected)).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it("系统要求重新加密时先写入新记录, 数据密钥仍原样交出", async () => {
    const dataKey = generateDataKey();
    const expected = Buffer.from(dataKey);
    vi.mocked(unprotectWithSystem).mockResolvedValue({
      dataKey,
      refreshedRecord: REFRESHED_RECORD,
    });
    const write = vi.fn(() => Promise.resolve());

    const result = await unlockSystemProtectedKey(
      RECORD,
      SAFE_STORAGE,
      createKeyFileStore(write),
    );

    expect(write).toHaveBeenCalledExactlyOnceWith(REFRESHED_RECORD);
    expect(result.equals(expected)).toBe(true);
  });

  it("写入新记录失败时清零数据密钥并抛出原错误", async () => {
    const dataKey = generateDataKey();
    vi.mocked(unprotectWithSystem).mockResolvedValue({
      dataKey,
      refreshedRecord: REFRESHED_RECORD,
    });
    const failure = new Error("disk full");
    const write = vi.fn(() => Promise.reject(failure));

    await expect(
      unlockSystemProtectedKey(RECORD, SAFE_STORAGE, createKeyFileStore(write)),
    ).rejects.toBe(failure);

    expect(dataKey.every((byte) => byte === 0)).toBe(true);
  });
});
