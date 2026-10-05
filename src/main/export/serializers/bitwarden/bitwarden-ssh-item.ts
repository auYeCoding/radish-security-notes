import {
  fieldValueOf,
  type BitwardenMappingInput,
  type BitwardenTypedMapping,
} from "./bitwarden-mapping";
import { BITWARDEN_ITEM_TYPE } from "./bitwarden-types";

/**
 * 私钥字段的键.
 */
const PRIVATE_KEY_FIELD_KEY = "privateKey";

/**
 * 公钥字段的键.
 */
const PUBLIC_KEY_FIELD_KEY = "publicKey";

/**
 * 把 SSH 密钥映射成 Bitwarden SSH 密钥: 私钥与公钥对应写入, 指纹本应用不存, 写空串; 主机, 端口,
 * 账号与密钥口令没有对应的属性, 写成自定义字段.
 * @param input 映射输入.
 * @returns 映射结果.
 */
export function mapSshKeyItem(
  input: BitwardenMappingInput,
): BitwardenTypedMapping {
  const { entry } = input;
  return {
    type: BITWARDEN_ITEM_TYPE.sshKey,
    typed: {
      sshKey: {
        privateKey: fieldValueOf(entry, PRIVATE_KEY_FIELD_KEY),
        publicKey: fieldValueOf(entry, PUBLIC_KEY_FIELD_KEY),
        keyFingerprint: "",
      },
    },
    consumedKeys: [PRIVATE_KEY_FIELD_KEY, PUBLIC_KEY_FIELD_KEY],
    notes: entry.notes,
  };
}
