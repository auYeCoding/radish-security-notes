import {
  findSshPublicKeyAlgorithm,
  type SshPublicKeyAlgorithm,
} from "./ssh-public-key-algorithms";
import { readSshWireFields } from "./ssh-wire-fields";

/**
 * 公钥一行里的分隔: 一个或多个空格或制表符.
 */
const SEPARATOR = /[ \t]+/;

/**
 * 公钥一行里不允许出现的换行.
 */
const LINE_BREAK = /[\r\n]/;

/**
 * 公钥一行的段数下限: 算法名与数据块, 注释可有可无.
 */
const REQUIRED_PART_COUNT = 2;

/**
 * 解析好的公钥.
 */
export interface SshPublicKey {
  /**
   * 算法名.
   */
  readonly algorithm: string;
  /**
   * 解码后的数据块, 指纹由它算出.
   */
  readonly blob: Buffer;
}

/**
 * 把 base64 文本解码成字节, 只接受标准 base64: 解码后再编码必须与原文完全一致.
 * @param encoded base64 文本.
 * @returns 解码后的字节; 不是规范的标准 base64 时为 undefined.
 */
function decodeCanonicalBase64(encoded: string): Buffer | undefined {
  const bytes = Buffer.from(encoded, "base64");
  return bytes.toString("base64") === encoded ? bytes : undefined;
}

/**
 * 判断数据块的结构是否符合算法: 第一个字段是算法名, 之后的字段个数固定且都不为空, 恰好读完.
 * @param blob 解码后的数据块.
 * @param algorithm 公钥类型.
 * @returns 结构符合时返回 true.
 */
function hasExpectedStructure(
  blob: Buffer,
  algorithm: SshPublicKeyAlgorithm,
): boolean {
  const fields = readSshWireFields(blob);
  if (fields === undefined) {
    return false;
  }
  const [nameField, ...keyFields] = fields;
  return (
    nameField?.equals(Buffer.from(algorithm.name, "ascii")) === true &&
    keyFields.length === algorithm.fieldCount &&
    keyFields.every((field) => field.length > 0)
  );
}

/**
 * 解析 OpenSSH 公钥一行: `<算法名> <base64 数据块> [注释]`, 容忍首尾空白. 只认单行与白名单内的
 * 算法, 数据块的结构不符合算法时同样视为无法解析.
 * @param text 公钥文本.
 * @returns 解析好的公钥; 无法解析时为 undefined.
 */
export function parseSshPublicKeyLine(text: string): SshPublicKey | undefined {
  const line = text.trim();
  if (LINE_BREAK.test(line)) {
    return undefined;
  }
  const parts = line.split(SEPARATOR);
  const [algorithmName, encodedBlob] = parts;
  if (parts.length < REQUIRED_PART_COUNT || encodedBlob === undefined) {
    return undefined;
  }
  const algorithm = findSshPublicKeyAlgorithm(algorithmName ?? "");
  const blob = decodeCanonicalBase64(encodedBlob);
  if (algorithm === undefined || blob === undefined) {
    return undefined;
  }
  return hasExpectedStructure(blob, algorithm)
    ? { algorithm: algorithm.name, blob }
    : undefined;
}
