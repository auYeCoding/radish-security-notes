import {
  ACCOUNT_FIELD,
  PASSWORD_FIELD,
  PORT_FIELD,
} from "../common-entry-fields";
import { defineEntryType, defineField } from "../entry-field-types";

/**
 * 数据库类型: 数据库类型, 服务器, 端口, 数据库名, 账号, 密码.
 */
export const DATABASE_TYPE = defineEntryType("database", [
  defineField("databaseKind"),
  defineField("databaseHost"),
  PORT_FIELD,
  defineField("databaseName"),
  ACCOUNT_FIELD,
  PASSWORD_FIELD,
]);
