import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { entries } from "./entry-schema";

/**
 * 附件元数据表, 在迁移 0008 加入: 每行是一个条目的一个附件, 只存名称与字节数, 内容在
 * `entry_attachment_contents`. 元数据与内容分开存放, 条目列表, 搜索与批量读取不碰内容表.
 * `position` 记附件在条目上的添加顺序. 外键级联删除, 条目被删除时附件随之删除; 附件的类型
 * 不另存, 由名称的扩展名推出.
 */
export const entryAttachments = sqliteTable(
  "entry_attachments",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    size: integer("size").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [index("entry_attachments_entry_id_index").on(table.entryId)],
);

/**
 * 附件内容表, 在迁移 0008 加入: 每行是一个附件的全部字节, 整块存放. 外键级联删除, 附件元数据被
 * 删除 (含条目被删除引起的级联) 时内容随之删除.
 */
export const entryAttachmentContents = sqliteTable(
  "entry_attachment_contents",
  {
    attachmentId: text("attachment_id")
      .primaryKey()
      .references(() => entryAttachments.id, { onDelete: "cascade" }),
    content: blob("content", { mode: "buffer" }).notNull(),
  },
);
