import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 软件许可证类型: 版本, 许可证密钥, 注册名称, 注册邮箱, 下载页网址, 其中许可证密钥敏感.
 */
export const SOFTWARE_LICENSE_TYPE = defineEntryType("softwareLicense", [
  defineField("version"),
  defineField("licenseKey", { isSensitive: true }),
  defineField("registeredName"),
  defineField("registeredEmail"),
  defineField("downloadUrl"),
]);
