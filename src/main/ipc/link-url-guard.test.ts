import { describe, expect, it } from "vitest";

import { requireExternalLinkUrl } from "./link-url-guard";

describe("requireExternalLinkUrl", () => {
  it("字符串原样返回, 包括空串与不合规的地址, 是否合规由打开器判定", () => {
    expect(requireExternalLinkUrl("https://example.test")).toBe(
      "https://example.test",
    );
    expect(requireExternalLinkUrl("")).toBe("");
    expect(requireExternalLinkUrl("javascript:alert(1)")).toBe(
      "javascript:alert(1)",
    );
  });

  it("不是字符串时抛出错误", () => {
    for (const value of [undefined, null, 1, true, {}, ["https://a.test"]]) {
      expect(() => requireExternalLinkUrl(value)).toThrow("无效的链接地址");
    }
  });
});
