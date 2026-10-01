/**
 * Argon2id 的成本参数, 随密钥文件一起保存, 以后调高取值不影响已有的保险库.
 */
export interface Argon2Parameters {
  /**
   * 内存开销, 单位千字节.
   */
  readonly memoryCostKibibytes: number;
  /**
   * 迭代次数.
   */
  readonly timeCost: number;
  /**
   * 并行度.
   */
  readonly parallelism: number;
}

/**
 * 内存开销, 单位千字节, 即 256 MiB.
 */
export const ARGON2_MEMORY_COST_KIBIBYTES = 262144;

/**
 * 迭代次数. 在开发机上与 256 MiB 搭配时, 一次派生约 0.5 至 0.6 秒.
 */
export const ARGON2_TIME_COST = 7;

/**
 * 并行度.
 */
export const ARGON2_PARALLELISM = 1;

/**
 * 盐的字节数.
 */
export const ARGON2_SALT_BYTES = 16;

/**
 * 派生密钥的字节数, 与 AES-256-GCM 的密钥长度一致.
 */
export const ARGON2_OUTPUT_BYTES = 32;

/**
 * Argon2id 在 `@node-rs/argon2` 的 `Algorithm` 枚举中的取值. 该枚举是环境声明的
 * const enum, 在 isolatedModules 下不能按名字引用, 只能按数值传入.
 */
export const ARGON2ID_ALGORITHM_VALUE = 2;

/**
 * Argon2 版本 0x13 在 `@node-rs/argon2` 的 `Version` 枚举中的取值, 原因同
 * `ARGON2ID_ALGORITHM_VALUE`.
 */
export const ARGON2_VERSION_0X13_VALUE = 1;

/**
 * 新建保险库时使用的 Argon2id 成本参数.
 */
export const DEFAULT_ARGON2_PARAMETERS: Argon2Parameters = {
  memoryCostKibibytes: ARGON2_MEMORY_COST_KIBIBYTES,
  timeCost: ARGON2_TIME_COST,
  parallelism: ARGON2_PARALLELISM,
};
