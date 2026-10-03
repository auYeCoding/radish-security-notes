import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 文件夹表: 每行是一个用户自建的文件夹, 在迁移 0006 加入. 文件夹只有一层, 名称去首尾空格后
 * 1 至 50 个字符且互不重名 (忽略英文大小写, 由服务保证). 创建时间只用来排序, 不展示给用户.
 * 条目属于哪个文件夹记在条目表的 `folder_id` 列, 文件夹被删除时由服务在同一个事务里清空这些列.
 */
export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});
