import { describe, expect, it, vi } from "vitest";

import { createFakeSafeStorage } from "../testing/vault-test-fixtures";
import { dataKeyFromHexadecimal, generateDataKey } from "./data-key";
import {
  SystemProtectionUnavailableError,
  protectWithSystem,
  unprotectWithSystem,
} from "./system-key-protector";

vi.mock("./data-key", async (importOriginal) => {
  const original = await importOriginal<typeof import("./data-key")>();
  return {
    ...original,
    dataKeyFromHexadecimal: vi.fn(original.dataKeyFromHexadecimal),
  };
});

describe("protectWithSystem 与 unprotectWithSystem 正常使用", () => {
  it("系统保护后能解出原来的数据密钥", async () => {
    const safeStorage = createFakeSafeStorage();
    const dataKey = generateDataKey();
    const record = await protectWithSystem(dataKey, safeStorage);

    const result = await unprotectWithSystem(record, safeStorage);

    expect(result.dataKey.equals(dataKey)).toBe(true);
    expect(result.refreshedRecord).toBeUndefined();
  });

  it("记录不含明文数据密钥", async () => {
    const dataKey = generateDataKey();

    const record = await protectWithSystem(dataKey, createFakeSafeStorage());

    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain(dataKey.toString("hex"));
    expect(serialized).not.toContain(dataKey.toString("base64"));
  });

  it("系统要求重新加密时给出新记录, 新记录仍能解出同一个数据密钥", async () => {
    const safeStorage = createFakeSafeStorage({ shouldReEncrypt: true });
    const dataKey = generateDataKey();
    const record = await protectWithSystem(dataKey, safeStorage);

    const result = await unprotectWithSystem(record, safeStorage);

    expect(safeStorage.getEncryptionCount()).toBe(2);
    expect(result.refreshedRecord).toBeDefined();
    const refreshed = await unprotectWithSystem(
      result.refreshedRecord!,
      createFakeSafeStorage(),
    );
    expect(refreshed.dataKey.equals(dataKey)).toBe(true);
  });
});

describe("unprotectWithSystem 失败路径清零数据密钥", () => {
  it("系统要求重新加密但重新加密失败时, 解出的数据密钥清零后才抛出", async () => {
    const record = await protectWithSystem(
      generateDataKey(),
      createFakeSafeStorage(),
    );
    const failing = createFakeSafeStorage({
      shouldReEncrypt: true,
      isAvailable: false,
    });

    await expect(unprotectWithSystem(record, failing)).rejects.toBeInstanceOf(
      SystemProtectionUnavailableError,
    );

    const decoded = vi.mocked(dataKeyFromHexadecimal).mock.results.at(-1);
    expect(decoded?.type).toBe("return");
    expect((decoded?.value as Buffer).every((byte) => byte === 0)).toBe(true);
  });

  it("重新加密成功时数据密钥不被清零", async () => {
    const dataKey = generateDataKey();
    const record = await protectWithSystem(dataKey, createFakeSafeStorage());

    const result = await unprotectWithSystem(
      record,
      createFakeSafeStorage({ shouldReEncrypt: true }),
    );

    expect(result.dataKey.equals(dataKey)).toBe(true);
  });
});

describe("protectWithSystem 与 unprotectWithSystem 失败情形", () => {
  it("系统不能加密时拒绝保护", async () => {
    const safeStorage = createFakeSafeStorage({ isAvailable: false });

    await expect(
      protectWithSystem(generateDataKey(), safeStorage),
    ).rejects.toBeInstanceOf(SystemProtectionUnavailableError);
    expect(safeStorage.getEncryptionCount()).toBe(0);
  });

  it("系统解密失败时向上抛出", async () => {
    const record = await protectWithSystem(
      generateDataKey(),
      createFakeSafeStorage(),
    );

    await expect(
      unprotectWithSystem(
        record,
        createFakeSafeStorage({ isDecryptionFailing: true }),
      ),
    ).rejects.toThrow("系统解密失败");
  });

  it("解出的内容不是数据密钥时抛出", async () => {
    const safeStorage = createFakeSafeStorage();
    const encrypted = await safeStorage.encryptStringAsync("not a key");
    const record = {
      version: 1,
      protection: "system-protected",
      wrappedDataKey: encrypted.toString("base64"),
    } as const;

    await expect(unprotectWithSystem(record, safeStorage)).rejects.toThrow(
      "数据密钥的格式不合法",
    );
  });
});
