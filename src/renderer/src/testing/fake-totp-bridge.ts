import { entryFailed, entrySucceeded } from "@shared/entries/entry-result";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { TotpCode } from "@shared/entries/totp-config";
import { vi } from "vitest";

/**
 * 假 TOTP 桥里默认的验证码, 周期 30 秒, 失效时刻是读取时刻之后的下一个整 30 秒.
 * @param now 读取验证码的时刻, 毫秒时间戳.
 * @returns 默认的验证码.
 */
function defaultCodeAt(now: number): TotpCode {
  const periodMilliseconds = 30000;
  return {
    code: "123456",
    expiresAt: now - (now % periodMilliseconds) + periodMilliseconds,
    periodSeconds: 30,
  };
}

/**
 * 创建组件测试用的假 TOTP 桥: 每个方法都是间谍. 取码返回默认验证码, 失效时刻随读取时刻的假时钟
 * 变化; 读密钥返回固定的 Base32 密钥; 复制成功; 解码二维码返回一个固定的 otpauth 链接.
 * @param overrides 覆盖假桥上的方法, 例如让取码失败.
 * @returns 假 TOTP 桥.
 */
export function createFakeTotpBridge(
  overrides: Partial<TotpBridge> = {},
): TotpBridge {
  return {
    getCode: vi.fn(() =>
      Promise.resolve(entrySucceeded(defaultCodeAt(Date.now()))),
    ),
    revealSecret: vi.fn(() =>
      Promise.resolve(entrySucceeded("JBSWY3DPEHPK3PXP")),
    ),
    copyCode: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    copySecret: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    decodeQrImage: vi.fn(() =>
      Promise.resolve(
        entrySucceeded("otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP"),
      ),
    ),
    ...overrides,
  };
}

/**
 * 让假桥的某个方法失败, 用于测试失败路径.
 * @param reason 失败原因.
 * @returns 总是返回失败结果的间谍.
 */
export function failingWith(
  reason: "not-found" | "invalid-input" | "unexpected-error",
): () => Promise<ReturnType<typeof entryFailed>> {
  return vi.fn(() => Promise.resolve(entryFailed(reason)));
}
