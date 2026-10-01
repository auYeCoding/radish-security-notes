import {
  ACCOUNT_FIELD,
  HOST_FIELD,
  PASSWORD_FIELD,
  PORT_FIELD,
  URL_FIELD,
} from "../common-entry-fields";
import { defineEntryType } from "../entry-field-types";

/**
 * 服务器类型: 主机地址, 端口, 账号, 密码, 网址.
 */
export const SERVER_TYPE = defineEntryType("server", [
  HOST_FIELD,
  PORT_FIELD,
  ACCOUNT_FIELD,
  PASSWORD_FIELD,
  URL_FIELD,
]);
