import type { ExportScope } from "@shared/export/export-request";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  selectAllEntryIds,
  selectAttachmentSizes,
} from "./dataset/export-row-queries";
import { selectRowsInScope } from "./dataset/export-scope-resolver";

/**
 * 一个导出范围的计数.
 */
export interface ExportScopeCounts {
  /**
   * 范围内的条目个数.
   */
  readonly entryCount: number;
  /**
   * 范围内条目带的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 范围内条目带的附件总字节数.
   */
  readonly attachmentBytes: number;
}

/**
 * 统计一个范围里的条目数, 附件个数与字节数. 只读, 只查编号与附件字节数, 不读条目内容.
 * @param orm 已解锁数据库的查询入口.
 * @param scope 导出的范围.
 * @returns 范围的计数.
 */
export function countExportScope(
  orm: VaultOrm,
  scope: ExportScope,
): ExportScopeCounts {
  return orm.transaction((transaction) => {
    const entryIds = new Set(
      selectRowsInScope(selectAllEntryIds(transaction), scope).map(
        (row) => row.id,
      ),
    );
    const attachments = selectAttachmentSizes(transaction).filter((row) =>
      entryIds.has(row.entryId),
    );
    return {
      entryCount: entryIds.size,
      attachmentCount: attachments.length,
      attachmentBytes: attachments.reduce((total, row) => total + row.size, 0),
    };
  });
}
