import {
  ACCOUNT_FIELD,
  PASSWORD_FIELD,
  URL_FIELD,
} from "../common-entry-fields";
import { defineEntryType } from "../entry-field-types";

/**
 * 通用登录类型: 账号, 密码, 网址. 0012 及以前建的旧条目升级后归入这个类型.
 */
export const LOGIN_TYPE = defineEntryType("login", [
  ACCOUNT_FIELD,
  PASSWORD_FIELD,
  URL_FIELD,
]);
