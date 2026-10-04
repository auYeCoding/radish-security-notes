import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { EntryCustomField } from "@shared/entries/custom-field-types";
import type { EntryFieldValues } from "@shared/entries/entry-types";
import {
  DEFAULT_NOTES_FORMAT,
  type NotesFormat,
} from "@shared/entries/notes-format";
import { LEGACY_ENTRY_TYPE_KEY } from "@shared/entries/preset-entry-types";
import type { TotpConfig } from "@shared/entries/totp-config";

/**
 * 条目表: 每行是一个条目. 创建时间只用来排序, 不展示给用户. 备注与自定义字段在迁移 0002
 * 加入, 对所有条目共有, 自定义字段按填写顺序存成 JSON 数组. 类型与类型字段在迁移 0003 加入:
 * `type` 是类型键, `fields` 是 JSON 对象, 键是该类型的字段键, 值是用户填写的文本; 旧的账号,
 * 密码与网址三列在迁移 0004 里删除, 旧条目归入通用登录. TOTP 在迁移 0005 加入, 对所有条目共有:
 * `totp` 是 JSON 对象, 含密钥, 算法, 位数与周期, 条目不带 TOTP 时为 NULL. 所属文件夹在迁移 0006
 * 加入: `folder_id` 是文件夹表里的编号, 条目未分类时为 NULL; 它不设外键, 文件夹被删除时由服务在
 * 同一个事务里把它清空. 备注格式在迁移 0009 加入: `notes_format` 是备注的呈现格式, 纯文本或
 * Markdown, 迁移之前已有的条目都是纯文本. `type` 是预设类型键, 或 `custom:` 加自定义类型编号
 * (自定义类型在迁移 0010 加入, 见 `custom-entry-type-schema.ts`), 自定义类型的字段键存进 `fields`.
 */
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<string>().notNull().default(LEGACY_ENTRY_TYPE_KEY),
  fields: text("fields", { mode: "json" })
    .$type<EntryFieldValues>()
    .notNull()
    .default({}),
  notes: text("notes").notNull().default(""),
  notesFormat: text("notes_format")
    .$type<NotesFormat>()
    .notNull()
    .default(DEFAULT_NOTES_FORMAT),
  customFields: text("custom_fields", { mode: "json" })
    .$type<readonly EntryCustomField[]>()
    .notNull()
    .default([]),
  totp: text("totp", { mode: "json" }).$type<TotpConfig>(),
  folderId: text("folder_id"),
  createdAt: integer("created_at").notNull(),
});
