import {
  ACCOUNT_FIELD_KEY,
  PASSWORD_FIELD,
  URL_FIELD,
} from "@shared/entries/common-entry-fields";

import {
  fieldValueOf,
  orNull,
  type BitwardenMappingInput,
  type BitwardenTypedMapping,
} from "./bitwarden-mapping";
import { formatBitwardenTotp } from "./bitwarden-totp";
import { BITWARDEN_ITEM_TYPE } from "./bitwarden-types";

/**
 * 把条目映射成 Bitwarden 登录: 账号进用户名, 密码进密码, 网址进网址列表, TOTP 进 totp. 登录,
 * 论坛, 数据库, 服务器, API Key, 软件许可证, WiFi, 加密钱包与全部自定义类型都走这个映射, 类型里
 * 没有这几个字段键的部分为空, 其余字段由调用方写成自定义字段.
 * @param input 映射输入.
 * @returns 映射结果.
 */
export function mapLoginItem(
  input: BitwardenMappingInput,
): BitwardenTypedMapping {
  const { entry } = input;
  const url = fieldValueOf(entry, URL_FIELD.key);
  return {
    type: BITWARDEN_ITEM_TYPE.login,
    typed: {
      login: {
        uris: url === "" ? [] : [{ match: null, uri: url }],
        username: orNull(fieldValueOf(entry, ACCOUNT_FIELD_KEY)),
        password: orNull(fieldValueOf(entry, PASSWORD_FIELD.key)),
        totp: entry.totp === undefined ? null : formatBitwardenTotp(entry.totp),
      },
    },
    consumedKeys: [ACCOUNT_FIELD_KEY, PASSWORD_FIELD.key, URL_FIELD.key],
    notes: entry.notes,
  };
}
