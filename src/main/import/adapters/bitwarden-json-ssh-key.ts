import { SSH_KEY_TYPE } from "@shared/entries/preset-types/ssh-key-type";

import { IMPORT_CUSTOM_FIELD_LABELS } from "../import-custom-field-labels";
import { customFieldIfFilled } from "../import-draft-builders";
import type { TypedFragment } from "./bitwarden-json-fragment";
import { readRecord, readText, type JsonRecord } from "./json-values";

/**
 * 把 Bitwarden 的 SSH 密钥 (type 5) 映射成 SSH 密钥类型: 私钥与公钥直接对应, 密钥指纹写成普通
 * 自定义字段 "指纹".
 * @param item Bitwarden 条目.
 * @returns SSH 密钥类型的内容.
 */
export function mapSshKey(item: JsonRecord): TypedFragment {
  const key = readRecord(item, "sshKey");
  return {
    typeKey: SSH_KEY_TYPE.key,
    fields: {
      privateKey: readText(key, "privateKey"),
      publicKey: readText(key, "publicKey"),
    },
    notes: readText(item, "notes"),
    customFields: customFieldIfFilled(
      IMPORT_CUSTOM_FIELD_LABELS.sshFingerprint,
      readText(key, "keyFingerprint"),
      false,
    ),
  };
}
