import {
  ACCOUNT_FIELD,
  HOST_FIELD,
  PORT_FIELD,
  PRIVATE_KEY_FIELD,
} from "../common-entry-fields";
import { defineEntryType, defineField } from "../entry-field-types";

/**
 * SSH 密钥类型: 主机地址, 端口, 账号, 私钥, 公钥, 密钥口令, 其中私钥与密钥口令敏感, 私钥与
 * 公钥是多行.
 */
export const SSH_KEY_TYPE = defineEntryType("sshKey", [
  HOST_FIELD,
  PORT_FIELD,
  ACCOUNT_FIELD,
  PRIVATE_KEY_FIELD,
  defineField("publicKey", { isMultiline: true }),
  defineField("keyPassphrase", { isSensitive: true }),
]);
