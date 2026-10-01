import {
  ACCOUNT_FIELD,
  EMAIL_FIELD,
  PASSWORD_FIELD,
  URL_FIELD,
} from "../common-entry-fields";
import { defineEntryType } from "../entry-field-types";

/**
 * 论坛账号类型: 账号, 密码, 邮箱, 网址.
 */
export const FORUM_TYPE = defineEntryType("forum", [
  ACCOUNT_FIELD,
  PASSWORD_FIELD,
  EMAIL_FIELD,
  URL_FIELD,
]);
