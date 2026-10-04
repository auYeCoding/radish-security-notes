import { describe, expect, it } from "vitest";

import {
  ALLOWED_EXTERNAL_LINK_PROTOCOLS,
  isAllowedExternalLink,
} from "./external-link-policy";

describe("外部链接策略", () => {
  it("允许的协议只有 http, https 与 mailto", () => {
    expect(ALLOWED_EXTERNAL_LINK_PROTOCOLS).toEqual([
      "http:",
      "https:",
      "mailto:",
    ]);
  });

  it.each([
    "http://example.com",
    "https://example.com/a?b=1#c",
    "HTTPS://EXAMPLE.COM",
    "mailto:someone@example.com",
  ])("允许 %s", (url) => {
    expect(isAllowedExternalLink(url)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "  javascript:alert(1)",
    "file:///C:/Windows/win.ini",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://example.com/file",
    "irc://example.com/room",
    "xmpp:someone@example.com",
    "tel:+10000000000",
    "ms-msdt:/id",
    "/relative/path",
    "./relative",
    "../relative",
    "#anchor",
    "?query=1",
    "example.com",
    "//example.com/protocol-relative",
    "",
    "http://",
  ])("不允许 %j", (url) => {
    expect(isAllowedExternalLink(url)).toBe(false);
  });
});
