import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import type { CustomFieldKind } from "@shared/entries/custom-types/custom-field-kinds";

/**
 * 自定义条目类型表: 每行是一个用户自建的条目类型, 在迁移 0010 加入. 名称去首尾空格后 1 至 50
 * 个字符且不与预设类型, 其它自定义类型重名 (忽略英文大小写, 由服务保证). 条目表 `type` 列存的
 * 类型键是 `custom:` 加 `id`. 创建时间决定类型在选择界面里的先后, 不展示给用户.
 */
export const customEntryTypes = sqliteTable("custom_entry_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

/**
 * 自定义条目类型的字段表, 在迁移 0010 加入: 每行是一个类型的一个字段, `key` 是存进条目 `fields`
 * JSON 的键 (列表摘要字段是 `account`, 其余是 `field-` 加编号), 字段名只存在这里, 所以改字段名
 * 不必改写条目. `position` 记字段在类型里的顺序, `kind` 是取值形态, `is_sensitive` 标明是否保密.
 * 外键级联删除, 类型被删除时它的字段随之删除.
 */
export const customEntryTypeFields = sqliteTable(
  "custom_entry_type_fields",
  {
    typeId: text("type_id")
      .notNull()
      .references(() => customEntryTypes.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    kind: text("kind").$type<CustomFieldKind>().notNull(),
    isSensitive: integer("is_sensitive", { mode: "boolean" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.typeId, table.key] })],
);
