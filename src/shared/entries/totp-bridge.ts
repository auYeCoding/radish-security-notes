import type { EntryResult } from "./entry-result";
import type { TotpCode } from "./totp-config";

/**
 * preload 暴露给渲染进程的 TOTP 接口. 验证码与密钥都在主进程里读取与生成, 复制由主进程写入
 * 系统剪贴板.
 */
export interface TotpBridge {
  /**
   * 生成一个条目此刻的验证码.
   * @param id 条目编号.
   * @returns 验证码, 失效时刻与周期, 条目不带 TOTP 时为 not-found 的失败结果.
   */
  getCode: (id: string) => Promise<EntryResult<TotpCode>>;
  /**
   * 读取一个条目的 TOTP 密钥, 只在用户点击显示时调用.
   * @param id 条目编号.
   * @returns Base32 密钥, 条目不带 TOTP 时为 not-found 的失败结果.
   */
  revealSecret: (id: string) => Promise<EntryResult<string>>;
  /**
   * 让主进程生成条目此刻的验证码并写入系统剪贴板, 验证码不经过渲染进程.
   * @param id 条目编号.
   * @returns 复制结果.
   */
  copyCode: (id: string) => Promise<EntryResult<undefined>>;
  /**
   * 让主进程把条目的 TOTP 密钥写入系统剪贴板, 密钥不经过渲染进程.
   * @param id 条目编号.
   * @returns 复制结果.
   */
  copySecret: (id: string) => Promise<EntryResult<undefined>>;
  /**
   * 让主进程解码一张二维码图片.
   * @param image 图片文件的字节.
   * @returns 二维码里的文本, 图片过大, 不是图片或读不到二维码时为 invalid-input 的失败结果.
   */
  decodeQrImage: (image: Uint8Array) => Promise<EntryResult<string>>;
}
