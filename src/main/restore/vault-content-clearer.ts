import {
  entryAttachmentContents,
  entryAttachments,
} from "../vault/database/attachment-schema";
import {
  customEntryTypeFields,
  customEntryTypes,
} from "../vault/database/custom-entry-type-schema";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { folders } from "../vault/database/folder-schema";
import { entryTags, tags } from "../vault/database/tag-schema";

/**
 * 清空保险库里的全部业务数据: 附件内容与元数据, 条目与标签的关联, 条目, 文件夹, 标签, 自定义
 * 类型的字段与类型. 按外键依赖的先后逐张删除, 不依赖级联. 邮箱设置, 备份计划等不是备份内容的
 * 表不动. 调用方要把它与后续写入放在同一个事务里.
 * @param orm 事务.
 */
export function clearVaultContent(orm: VaultOrm): void {
  orm.delete(entryAttachmentContents).run();
  orm.delete(entryAttachments).run();
  orm.delete(entryTags).run();
  orm.delete(entries).run();
  orm.delete(folders).run();
  orm.delete(tags).run();
  orm.delete(customEntryTypeFields).run();
  orm.delete(customEntryTypes).run();
}
