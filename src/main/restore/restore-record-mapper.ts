import type { EntryRecord } from "../entries/entry-repository";
import type { CustomEntryTypeRows } from "../entry-types/custom-entry-type-repository";
import type { FolderRecord } from "../folders/folder-repository";
import type { TagRecord } from "../tags/tag-repository";
import type { AttachmentRow } from "../attachments/attachment-repository";
import type {
  NativeAttachmentDocument,
  NativeCustomTypeDocument,
  NativeEntryDocument,
  NativeFolderDocument,
  NativeTagDocument,
} from "../export/serializers/native/native-format-types";

/**
 * 把备份里的文件夹转成文件夹行. 创建时间不在备份格式里, 由调用方统一给出.
 * @param folder 备份里的文件夹.
 * @param createdAt 创建时间的毫秒时间戳.
 * @returns 文件夹行, 编号与名称原样保留.
 */
export function toFolderRecord(
  folder: NativeFolderDocument,
  createdAt: number,
): FolderRecord {
  return { id: folder.id, name: folder.name, createdAt };
}

/**
 * 把备份里的标签转成标签行. 创建时间不在备份格式里, 由调用方统一给出.
 * @param tag 备份里的标签.
 * @param createdAt 创建时间的毫秒时间戳.
 * @returns 标签行, 编号, 名称与颜色原样保留.
 */
export function toTagRecord(
  tag: NativeTagDocument,
  createdAt: number,
): TagRecord {
  return { id: tag.id, name: tag.name, color: tag.color, createdAt };
}

/**
 * 把备份里的自定义类型转成类型行与字段行. 创建时间不在备份格式里, 由调用方统一给出.
 * @param type 备份里的自定义类型.
 * @param createdAt 创建时间的毫秒时间戳.
 * @returns 类型行与字段行, 字段位置按备份里的顺序.
 */
export function toCustomTypeRows(
  type: NativeCustomTypeDocument,
  createdAt: number,
): CustomEntryTypeRows {
  return {
    type: { id: type.id, name: type.name, createdAt },
    fields: type.fields.map((field, position) => ({
      typeId: type.id,
      key: field.key,
      position,
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
    })),
  };
}

/**
 * 把备份里的条目转成条目行, 编号, 类型, 字段, 备注, 自定义字段, TOTP, 所属文件夹与创建时间都
 * 原样保留.
 * @param entry 备份里的条目.
 * @returns 条目行.
 */
export function toEntryRecord(entry: NativeEntryDocument): EntryRecord {
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    fields: entry.fields,
    notes: entry.notes,
    notesFormat: entry.notesFormat,
    customFields: entry.customFields,
    totp: entry.totp,
    folderId: entry.folderId,
    createdAt: entry.createdAt,
  };
}

/**
 * 把备份里的附件声明转成附件元数据行.
 * @param attachment 备份里的附件声明.
 * @param entryId 附件所属条目的编号.
 * @returns 附件元数据行, 编号, 名称, 大小与添加顺序原样保留.
 */
export function toAttachmentRow(
  attachment: NativeAttachmentDocument,
  entryId: string,
): AttachmentRow {
  return {
    id: attachment.id,
    entryId,
    name: attachment.name,
    size: attachment.size,
    position: attachment.position,
  };
}
