import { describe, expect, it } from "vitest";

import {
  DATA_KEY_BYTES,
  dataKeyFromHexadecimal,
  dataKeyToHexadecimal,
  generateDataKey,
} from "./data-key";

describe("generateDataKey", () => {
  it("生成 32 字节且每次不同的随机密钥", () => {
    const first = generateDataKey();
    const second = generateDataKey();

    expect(first.length).toBe(DATA_KEY_BYTES);
    expect(first.equals(second)).toBe(false);
  });
});

describe("数据密钥与十六进制文本互转", () => {
  it("转成十六进制后能还原", () => {
    const dataKey = generateDataKey();

    const restored = dataKeyFromHexadecimal(dataKeyToHexadecimal(dataKey));

    expect(restored.equals(dataKey)).toBe(true);
  });

  it("长度不对的文本被拒绝", () => {
    expect(() => dataKeyFromHexadecimal("abcd")).toThrow(
      "数据密钥的格式不合法",
    );
  });

  it("含非十六进制字符的文本被拒绝", () => {
    expect(() => dataKeyFromHexadecimal("zz".repeat(DATA_KEY_BYTES))).toThrow(
      "数据密钥的格式不合法",
    );
  });
});
