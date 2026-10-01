import { randomBytes } from "node:crypto";

import { hashRaw } from "@node-rs/argon2";

import {
  ARGON2_OUTPUT_BYTES,
  ARGON2_SALT_BYTES,
  ARGON2_VERSION_0X13_VALUE,
  ARGON2ID_ALGORITHM_VALUE,
  type Argon2Parameters,
} from "./argon2-parameters";

/**
 * 从主密码派生密钥所需的输入.
 */
export interface PasswordKeyDerivationInput {
  /**
   * 用户的主密码.
   */
  readonly password: string;
  /**
   * 盐.
   */
  readonly salt: Buffer;
  /**
   * Argon2id 成本参数.
   */
  readonly parameters: Argon2Parameters;
}

/**
 * 生成随机的 Argon2 盐.
 * @returns 随机盐.
 */
export function generateArgon2Salt(): Buffer {
  return randomBytes(ARGON2_SALT_BYTES);
}

/**
 * 用 Argon2id 从主密码派生出包裹数据密钥用的密钥. 派生前先做 Unicode NFKC 规范化, 让
 * 同一个密码的不同写法 (预组合与组合重音, 全角与半角) 派生出同一个密钥, 避免换输入法或
 * 从别处粘贴后被拒绝. 这是保险库格式的一部分, 保险库建立之后不能再改.
 * @param input 主密码, 盐与成本参数.
 * @returns 派生出的密钥.
 */
export function deriveKeyFromPassword(
  input: PasswordKeyDerivationInput,
): Promise<Buffer> {
  return hashRaw(input.password.normalize("NFKC"), {
    algorithm: ARGON2ID_ALGORITHM_VALUE,
    version: ARGON2_VERSION_0X13_VALUE,
    salt: input.salt,
    outputLen: ARGON2_OUTPUT_BYTES,
    memoryCost: input.parameters.memoryCostKibibytes,
    timeCost: input.parameters.timeCost,
    parallelism: input.parameters.parallelism,
  });
}
