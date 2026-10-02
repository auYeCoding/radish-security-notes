import {
  entryFailed,
  entrySucceeded,
  type EntryResult,
} from "@shared/entries/entry-result";
import type { TotpCode, TotpConfig } from "@shared/entries/totp-config";

import type { ClipboardPort } from "./clipboard-port";
import {
  runWithEntryDatabase,
  type EntryDatabaseAccess,
} from "./entry-database-access";
import { findEntry } from "./entry-repository";
import { generateTotpCode } from "./totp-code-generator";

/**
 * TOTP 服务的依赖.
 */
export interface TotpServiceDependencies extends EntryDatabaseAccess {
  /**
   * 系统剪贴板.
   */
  readonly clipboard: ClipboardPort;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
}

/**
 * TOTP 服务: 为已解锁的加密数据库里的条目生成验证码, 读取密钥, 并把验证码或密钥复制到剪贴板.
 * 密钥与验证码只在方法执行期间经过内存, 不写入日志.
 */
export class TotpService {
  /**
   * 创建 TOTP 服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: TotpServiceDependencies) {}

  /**
   * 生成一个条目此刻的验证码.
   * @param id 条目编号.
   * @returns 验证码, 失效时刻与周期; 未解锁时为失败结果, 没有这个条目或条目不带 TOTP 时为
   * not-found 的失败结果.
   */
  getCode(id: string): EntryResult<TotpCode> {
    return this.withTotp(id, (config) =>
      entrySucceeded(generateTotpCode(config, this.dependencies.now())),
    );
  }

  /**
   * 读取一个条目的 TOTP 密钥.
   * @param id 条目编号.
   * @returns Base32 密钥, 失败的情形同 `getCode`.
   */
  revealSecret(id: string): EntryResult<string> {
    return this.withTotp(id, (config) => entrySucceeded(config.secret));
  }

  /**
   * 生成一个条目此刻的验证码并写入系统剪贴板.
   * @param id 条目编号.
   * @returns 复制结果, 失败的情形同 `getCode`.
   */
  copyCode(id: string): EntryResult<undefined> {
    return this.withTotp(id, (config) => {
      const { code } = generateTotpCode(config, this.dependencies.now());
      this.dependencies.clipboard.writeText(code);
      return entrySucceeded(undefined);
    });
  }

  /**
   * 把一个条目的 TOTP 密钥写入系统剪贴板.
   * @param id 条目编号.
   * @returns 复制结果, 失败的情形同 `getCode`.
   */
  copySecret(id: string): EntryResult<undefined> {
    return this.withTotp(id, (config) => {
      this.dependencies.clipboard.writeText(config.secret);
      return entrySucceeded(undefined);
    });
  }

  /**
   * 在条目的 TOTP 配置上执行一个操作.
   * @param id 条目编号.
   * @param operation 要执行的操作.
   * @returns 操作结果, 没有这个条目或条目不带 TOTP 时为 not-found 的失败结果.
   */
  private withTotp<Value>(
    id: string,
    operation: (config: TotpConfig) => EntryResult<Value>,
  ): EntryResult<Value> {
    return runWithEntryDatabase(this.dependencies, (orm) => {
      const config = findEntry(orm, id)?.totp ?? undefined;
      return config === undefined
        ? entryFailed("not-found")
        : operation(config);
    });
  }
}
