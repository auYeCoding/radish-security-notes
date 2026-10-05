import { BANK_CARD_TYPE } from "@shared/entries/preset-types/bank-card-type";
import { IDENTITY_TYPE } from "@shared/entries/preset-types/identity-type";
import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";
import { SECURE_NOTE_TYPE } from "@shared/entries/preset-types/secure-note-type";
import { SSH_KEY_TYPE } from "@shared/entries/preset-types/ssh-key-type";

import type { ExportDataset, ExportEntry } from "../../dataset/export-dataset";
import { mapCardItem } from "./bitwarden-card-item";
import { entryCustomFieldsOf, typeFieldsOf } from "./bitwarden-custom-fields";
import { mapIdentityItem } from "./bitwarden-identity-item";
import { mapLoginItem } from "./bitwarden-login-item";
import type {
  BitwardenMappingInput,
  BitwardenTypedMapper,
} from "./bitwarden-mapping";
import { orNull } from "./bitwarden-mapping";
import { mapNoteItem } from "./bitwarden-note-item";
import { mapSshKeyItem } from "./bitwarden-ssh-item";
import type { BitwardenItem } from "./bitwarden-types";

/**
 * 有专属映射的类型键对应的映射函数, 其余类型都按登录映射.
 */
const DEDICATED_MAPPERS: ReadonlyMap<string, BitwardenTypedMapper> = new Map([
  [SECURE_NOTE_TYPE.key, mapNoteItem],
  [BANK_CARD_TYPE.key, mapCardItem],
  [IDENTITY_TYPE.key, mapIdentityItem],
  [SSH_KEY_TYPE.key, mapSshKeyItem],
]);

/**
 * 判断一个类型在 Bitwarden 里是否没有对应的类型而被并入登录: 不是登录, 安全笔记, 银行卡,
 * 身份, SSH 密钥.
 * @param typeKey 条目的类型键.
 * @returns 被并入登录时返回 true.
 */
export function isMergedIntoLogin(typeKey: string): boolean {
  return typeKey !== LOGIN_TYPE.key && !DEDICATED_MAPPERS.has(typeKey);
}

/**
 * 把毫秒时间戳写成 ISO 8601 文本.
 * @param timestamp 毫秒时间戳.
 * @returns ISO 8601 文本.
 */
function toIsoText(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * 把数据集里的一个条目转成 Bitwarden 导出 JSON 里的条目: 按类型映射专属部分, 没被专属部分用掉的
 * 非空类型字段与条目自己的自定义字段写成自定义字段, 备注原文写进备注.
 * @param entry 数据集里的条目.
 * @param dataset 数据集, 用来查类型定义.
 * @param labelOfField 取预设字段名称的函数.
 * @returns Bitwarden 条目.
 */
export function toBitwardenItem(
  entry: ExportEntry,
  dataset: ExportDataset,
  labelOfField: (fieldKey: string) => string,
): BitwardenItem {
  const input: BitwardenMappingInput = {
    entry,
    definition: dataset.catalog.find(entry.typeKey),
    labelOfField,
  };
  const mapper = DEDICATED_MAPPERS.get(entry.typeKey) ?? mapLoginItem;
  const mapping = mapper(input);
  const fields = [
    ...typeFieldsOf(input, new Set(mapping.consumedKeys)),
    ...entryCustomFieldsOf(entry),
  ];
  return {
    passwordHistory: null,
    revisionDate: toIsoText(entry.createdAt),
    creationDate: toIsoText(entry.createdAt),
    deletedDate: null,
    id: entry.id,
    organizationId: null,
    folderId: entry.folderId ?? null,
    type: mapping.type,
    reprompt: 0,
    name: entry.name,
    notes: orNull(mapping.notes),
    favorite: false,
    ...(fields.length > 0 ? { fields } : {}),
    ...mapping.typed,
    collectionIds: null,
  };
}
