import { PRIVATE_KEY_FIELD } from "@shared/entries/common-entry-fields";
import {
  SSH_KEY_TYPE,
  SSH_PUBLIC_KEY_FIELD,
} from "@shared/entries/preset-types/ssh-key-type";

import { fingerprintOfSshPublicKey } from "../../../ssh-keys/ssh-key-fingerprint";
import { parseSshPublicKeyLine } from "../../../ssh-keys/ssh-public-key-line";
import type { ExportEntry } from "../../dataset/export-dataset";
import { fieldValueOf } from "./bitwarden-mapping";

/**
 * 能按 Bitwarden SSH 密钥导出的密钥内容: 官方导入器要求这三项都非空.
 */
export interface ExportableSshKey {
  /**
   * 私钥原文.
   */
  readonly privateKey: string;
  /**
   * 公钥原文.
   */
  readonly publicKey: string;
  /**
   * 由公钥算出的 SHA256 指纹.
   */
  readonly keyFingerprint: string;
}

/**
 * 判断 SSH 密钥条目能否按 Bitwarden SSH 密钥导出, 能则给出私钥, 公钥与由公钥算出的指纹. 私钥只判断
 * 去掉首尾空白后是否非空 (与官方导入器同一判断), 不解析内容; 公钥必须是能解析的 OpenSSH 公钥一行.
 * @param entry SSH 密钥类型的条目.
 * @returns 能导出时为密钥内容; 缺私钥, 缺公钥或公钥无法解析时为 undefined.
 */
export function exportableSshKeyOf(
  entry: ExportEntry,
): ExportableSshKey | undefined {
  const privateKey = fieldValueOf(entry, PRIVATE_KEY_FIELD.key);
  const publicKey = fieldValueOf(entry, SSH_PUBLIC_KEY_FIELD.key);
  const parsedPublicKey = parseSshPublicKeyLine(publicKey);
  if (privateKey.trim() === "" || parsedPublicKey === undefined) {
    return undefined;
  }
  return {
    privateKey,
    publicKey,
    keyFingerprint: fingerprintOfSshPublicKey(parsedPublicKey),
  };
}

/**
 * 判断条目是否是被降级为登录导出的 SSH 密钥: 类型是 SSH 密钥, 但不能按 SSH 密钥导出.
 * @param entry 条目.
 * @returns 被降级时返回 true.
 */
export function isDowngradedSshKey(entry: ExportEntry): boolean {
  return (
    entry.typeKey === SSH_KEY_TYPE.key &&
    exportableSshKeyOf(entry) === undefined
  );
}
