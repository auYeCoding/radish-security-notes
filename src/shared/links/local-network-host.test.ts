import { describe, expect, it } from "vitest";

import { isLocalNetworkHost } from "./local-network-host";

/**
 * 取一个完整地址解析后的主机名, 与调用方传入的写法一致.
 * @param url 完整地址.
 * @returns `URL.hostname` 的值.
 */
function hostnameOf(url: string): string {
  return new URL(url).hostname;
}

describe("isLocalNetworkHost 局域网与本机", () => {
  it.each([
    "http://10.0.0.1/",
    "http://10.255.255.255/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.0.1/admin",
    "http://192.168.1.1:8080/",
    "http://127.0.0.1:5173/",
    "http://127.1.2.3/",
    "http://169.254.10.20/",
    "http://localhost/",
    "http://LOCALHOST:3000/",
    "http://app.localhost/",
    "http://printer.local/",
    "http://gateway.home.arpa/",
    "http://nas/",
    "http://router./",
    "http://[::1]/",
    "http://[fc00::1]/",
    "http://[fd12:3456:789a::1]/",
    "http://[fe80::1]/",
    "http://[febf::1]/",
  ])("%s 的主机是本机或局域网", (url) => {
    expect(isLocalNetworkHost(hostnameOf(url))).toBe(true);
  });

  it.each([
    "http://0x7f.1/",
    "http://0177.0.0.1/",
    "http://2130706433/",
    "http://192.168.1/",
    "http://0300.0250.0.1/",
  ])("%s 经 URL 归一后是局域网地址", (url) => {
    expect(isLocalNetworkHost(hostnameOf(url))).toBe(true);
  });
});

describe("isLocalNetworkHost 公网", () => {
  it.each([
    "http://example.com/",
    "http://example.com./",
    "http://8.8.8.8/",
    "http://1.1.1.1/",
    "http://172.15.255.255/",
    "http://172.32.0.1/",
    "http://192.167.1.1/",
    "http://192.169.1.1/",
    "http://169.253.1.1/",
    "http://11.0.0.1/",
    "http://126.0.0.1/",
    "http://128.0.0.1/",
    "http://[2001:db8::1]/",
    "http://[fb00::1]/",
    "http://[fe00::1]/",
    "http://[fec0::1]/",
    "http://[::]/",
    "http://[::ffff:8.8.8.8]/",
  ])("%s 的主机是公网地址", (url) => {
    expect(isLocalNetworkHost(hostnameOf(url))).toBe(false);
  });

  it.each([
    "http://local.example.com/",
    "http://example.local.evil.com/",
    "http://localhost.evil.com/",
    "http://notlocalhost.com/",
    "http://evil-local.com/",
    "http://127.0.0.1.nip.io/",
    "http://192.168.1.1.evil.com/",
    "http://home.arpa.evil.com/",
    "http://192.168.1.1@evil.com/",
    "http://evil.com#@192.168.1.1/",
    "http://evil.com/192.168.1.1",
    "http://010.0.0.1/",
    "http://0x08.0.0.1/",
  ])("%s 伪装成局域网也按真实主机判断为公网", (url) => {
    expect(isLocalNetworkHost(hostnameOf(url))).toBe(false);
  });
});

describe("isLocalNetworkHost 边界输入", () => {
  it("空主机名不算局域网", () => {
    expect(isLocalNetworkHost("")).toBe(false);
  });

  it("只有结尾点的主机名不算局域网", () => {
    expect(isLocalNetworkHost(".")).toBe(false);
  });

  it("超过 255 的段不是 IPv4 地址, 按名字判断为公网", () => {
    expect(isLocalNetworkHost("10.0.0.256")).toBe(false);
  });
});
