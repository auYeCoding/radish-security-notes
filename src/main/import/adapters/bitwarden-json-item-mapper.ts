import { emptyDraft } from "../import-draft-builders";
import type { ImportedEntryDraft } from "../source-adapter";
import { mapBankCard } from "./bitwarden-json-card";
import { findItemLosses, mapCustomFields } from "./bitwarden-json-fields";
import type { TypeMapper } from "./bitwarden-json-fragment";
import { mapIdentity } from "./bitwarden-json-identity";
import { mapLogin } from "./bitwarden-json-login";
import { mapSecureNote } from "./bitwarden-json-secure-note";
import { mapSshKey } from "./bitwarden-json-ssh-key";
import { readNumber, readText, type JsonRecord } from "./json-values";

/**
 * Bitwarden 条目类型取值到映射函数的对应: 1 登录, 2 安全笔记, 3 卡, 4 身份, 5 SSH 密钥. 其余取值
 * (官方文档没有说明的类型) 没有对应类型.
 */
const TYPE_MAPPERS: ReadonlyMap<number, TypeMapper> = new Map([
  [1, mapLogin],
  [2, mapSecureNote],
  [3, mapBankCard],
  [4, mapIdentity],
  [5, mapSshKey],
]);

/**
 * 把一个 Bitwarden 条目映射成草稿: 按类型映射类型字段, 再统一处理名称, 文件夹, 自定义字段与
 * 收藏等带不进的内容. 类型没有对应类型时草稿没有类型键, 规划器会把它整条列入清单.
 * @param item Bitwarden 条目.
 * @param folderNames 文件夹编号到名称的映射.
 * @returns 草稿.
 */
export function mapBitwardenItem(
  item: JsonRecord,
  folderNames: ReadonlyMap<string, string>,
): ImportedEntryDraft {
  const name = readText(item, "name");
  const mapper = TYPE_MAPPERS.get(readNumber(item, "type") ?? -1);
  if (mapper === undefined) {
    return emptyDraft(name, undefined);
  }
  const fragment = mapper(item);
  const custom = mapCustomFields(item);
  return {
    ...emptyDraft(name, fragment.typeKey),
    fields: fragment.fields,
    notes: fragment.notes ?? "",
    customFields: [...(fragment.customFields ?? []), ...custom.customFields],
    totp: fragment.totp ?? "",
    folderPath: folderNames.get(readText(item, "folderId")) ?? "",
    losses: [
      ...findItemLosses(item),
      ...custom.losses,
      ...(fragment.losses ?? []),
    ],
  };
}
