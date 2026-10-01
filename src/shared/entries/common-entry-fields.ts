import { defineField } from "./entry-field-types";

/**
 * 账号字段的键. 键为它的字段同时决定列表第二行显示的账号与搜索匹配的账号.
 */
export const ACCOUNT_FIELD_KEY = "account";

/**
 * 账号字段允许的最多字符数.
 */
export const ENTRY_ACCOUNT_MAX_LENGTH = 200;

/**
 * 密码字段允许的最多字符数.
 */
export const ENTRY_PASSWORD_MAX_LENGTH = 1000;

/**
 * 账号字段, 多个类型共用.
 */
export const ACCOUNT_FIELD = defineField(ACCOUNT_FIELD_KEY, {
  maxLength: ENTRY_ACCOUNT_MAX_LENGTH,
});

/**
 * 密码字段, 敏感, 多个类型共用.
 */
export const PASSWORD_FIELD = defineField("password", {
  isSensitive: true,
  maxLength: ENTRY_PASSWORD_MAX_LENGTH,
});

/**
 * 网址字段, 多个类型共用.
 */
export const URL_FIELD = defineField("url");

/**
 * 邮箱字段, 多个类型共用.
 */
export const EMAIL_FIELD = defineField("email");

/**
 * 主机地址字段, 多个类型共用.
 */
export const HOST_FIELD = defineField("host");

/**
 * 端口字段, 多个类型共用.
 */
export const PORT_FIELD = defineField("port");

/**
 * 私钥字段, 敏感且多行, 多个类型共用.
 */
export const PRIVATE_KEY_FIELD = defineField("privateKey", {
  isSensitive: true,
  isMultiline: true,
});
