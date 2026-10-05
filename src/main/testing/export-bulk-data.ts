import { insertAttachmentContent } from "../attachments/attachment-content-repository";
import { insertAttachmentRow } from "../attachments/attachment-repository";
import { insertEntry } from "../entries/entry-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 批量样例条目的参数.
 */
export interface BulkSampleOptions {
  /**
   * 条目个数.
   */
  readonly count: number;
  /**
   * 每隔多少个条目带一个附件, 不给则不带附件.
   */
  readonly attachmentEvery?: number;
  /**
   * 每个附件的字节数, 默认 1024.
   */
  readonly attachmentBytes?: number;
}

/**
 * 批量样例条目的编号前缀.
 */
export const BULK_ENTRY_ID_PREFIX = "bulk-";

/**
 * 在一个事务里写入大量合成的登录条目, 有些带一个附件. 条目名称含非 ASCII 字符, 账号, 密码与
 * 网址随序号变化, 全是合成数据.
 * @param orm 已解锁数据库的查询入口.
 * @param options 个数与附件参数.
 * @returns 带附件的条目个数.
 */
export function seedBulkEntries(
  orm: VaultOrm,
  options: BulkSampleOptions,
): number {
  const attachmentBytes = options.attachmentBytes ?? 1024;
  let attachmentCount = 0;
  orm.transaction((transaction) => {
    for (let index = 0; index < options.count; index += 1) {
      const id = `${BULK_ENTRY_ID_PREFIX}${index}`;
      insertEntry(transaction, {
        id,
        name: `批量条目 ${index}`,
        type: "login",
        fields: {
          account: `user-${index}@example.com`,
          password: `pw-${index}-"x",y`,
          url: `https://site-${index}.example.com`,
        },
        notes: `备注 ${index}\n第二行`,
        notesFormat: "plain",
        customFields: [],
        totp: null,
        folderId: null,
        createdAt: index,
      });
      if (
        options.attachmentEvery !== undefined &&
        index % options.attachmentEvery === 0
      ) {
        const attachmentId = `bulk-att-${index}`;
        insertAttachmentRow(transaction, {
          id: attachmentId,
          entryId: id,
          name: `附件-${index}.bin`,
          size: attachmentBytes,
          position: 0,
        });
        insertAttachmentContent(
          transaction,
          attachmentId,
          Buffer.alloc(attachmentBytes, index % 251),
        );
        attachmentCount += 1;
      }
    }
  });
  return attachmentCount;
}
