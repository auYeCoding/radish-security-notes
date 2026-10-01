import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 无线网络凭据类型: 网络名称, 网络密码, 安全类型, 路由器地址, 路由器账号, 路由器密码, 其中
 * 网络密码与路由器密码敏感.
 */
export const WIFI_TYPE = defineEntryType("wifi", [
  defineField("networkName"),
  defineField("networkPassword", { isSensitive: true }),
  defineField("securityKind"),
  defineField("routerAddress"),
  defineField("routerAccount"),
  defineField("routerPassword", { isSensitive: true }),
]);
