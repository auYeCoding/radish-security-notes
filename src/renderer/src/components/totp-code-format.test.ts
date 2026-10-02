import { describe, expect, it } from "vitest";

import { groupTotpCode } from "./totp-code-format";

describe("groupTotpCode", () => {
  it("6 位验证码分成 3 位与 3 位", () => {
    expect(groupTotpCode("123456")).toBe("123 456");
  });

  it("8 位验证码分成 4 位与 4 位", () => {
    expect(groupTotpCode("12345678")).toBe("1234 5678");
  });

  it("保留前导零", () => {
    expect(groupTotpCode("005924")).toBe("005 924");
    expect(groupTotpCode("07081804")).toBe("0708 1804");
  });
});
