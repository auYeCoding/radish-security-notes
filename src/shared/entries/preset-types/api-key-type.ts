import { ACCOUNT_FIELD, HOST_FIELD } from "../common-entry-fields";
import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 接口密钥类型: 主机地址, 账号, 密钥, 其中密钥敏感.
 */
export const API_KEY_TYPE = defineEntryType("apiKey", [
  HOST_FIELD,
  ACCOUNT_FIELD,
  defineField("apiKey", { isSensitive: true }),
]);
