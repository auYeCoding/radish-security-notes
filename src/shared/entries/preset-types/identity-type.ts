import { EMAIL_FIELD } from "../common-entry-fields";
import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 身份信息类型: 姓名, 邮箱, 电话, 证件号码, 地址, 其中证件号码敏感, 地址是多行.
 */
export const IDENTITY_TYPE = defineEntryType("identity", [
  defineField("fullName"),
  EMAIL_FIELD,
  defineField("phone"),
  defineField("documentNumber", { isSensitive: true }),
  defineField("address", { isMultiline: true }),
]);
