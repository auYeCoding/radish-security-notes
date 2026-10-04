import { eq } from "drizzle-orm";

import { entryAttachmentContents } from "../vault/database/attachment-schema";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 插入一个附件的内容行, 内容整块存放.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param attachmentId 附件编号, 对应的元数据行必须已存在.
 * @param content 附件的全部字节.
 */
export function insertAttachmentContent(
  orm: VaultOrm,
  attachmentId: string,
  content: Buffer,
): void {
  orm.insert(entryAttachmentContents).values({ attachmentId, content }).run();
}

/**
 * 读取一个附件的全部字节.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param attachmentId 附件编号.
 * @returns 附件内容, 没有这个编号时为 undefined.
 */
export function findAttachmentContent(
  orm: VaultOrm,
  attachmentId: string,
): Buffer | undefined {
  return orm
    .select({ content: entryAttachmentContents.content })
    .from(entryAttachmentContents)
    .where(eq(entryAttachmentContents.attachmentId, attachmentId))
    .get()?.content;
}
