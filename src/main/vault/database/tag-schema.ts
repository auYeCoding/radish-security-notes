import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import type { TagColorKey } from "@shared/tags/tag-colors";

import { entries } from "./entry-schema";

/**
 * 标签表: 每行是一个用户自建的标签, 在迁移 0007 加入. 名称去首尾空格后 1 至 50 个字符且互不重名
 * (忽略英文大小写, 由服务保证), 颜色是调色板里的键. 创建时间只用来排序, 不展示给用户.
 */
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").$type<TagColorKey>().notNull(),
  createdAt: integer("created_at").notNull(),
});

/**
 * 条目与标签的关联表, 在迁移 0007 加入: 每行表示一个条目带一个标签, `position` 记标签在条目上
 * 的选择顺序. 两个外键都是级联删除, 条目或标签被删除时关联随之删除, 另一方不受影响.
 */
export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.tagId] }),
    index("entry_tags_tag_id_index").on(table.tagId),
  ],
);
