import { describe, expect, it } from "vitest";

import {
  ALLOWED_EXTERNAL_LINK_PROTOCOLS,
  LOCAL_NETWORK_ONLY_PROTOCOLS,
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
    "https://example.com/a?b=1#c",
    "HTTPS://EXAMPLE.COM",
    "https://192.168.1.1/",
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

describe("外部链接策略: http 只限局域网", () => {
  it("只限局域网的协议只有 http", () => {
    expect(LOCAL_NETWORK_ONLY_PROTOCOLS).toEqual(["http:"]);
  });

  it.each([
    "http://192.168.1.1/",
    "http://192.168.0.1:8080/admin",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://127.0.0.1:5173/",
    "HTTP://LOCALHOST/",
    "http://printer.local/",
    "http://nas/",
    "http://[::1]/",
  ])("局域网与本机的 http 地址 %s 允许", (url) => {
    expect(isAllowedExternalLink(url)).toBe(true);
  });

  it.each([
    "http://example.com",
    "http://example.com/a?b=1#c",
    "http://8.8.8.8/",
    "http://172.32.0.1/",
    "http://192.168.1.1@example.com/",
    "http://localhost.example.com/",
    "http://127.0.0.1.nip.io/",
  ])("公网的 http 地址 %s 不允许", (url) => {
    expect(isAllowedExternalLink(url)).toBe(false);
  });
});
