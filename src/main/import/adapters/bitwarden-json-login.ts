import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import { isFilled, splitUrls } from "../import-draft-builders";
import type { SourceLoss } from "../source-adapter";
import type { TypedFragment } from "./bitwarden-json-fragment";
import {
  isJsonRecord,
  readArray,
  readRecord,
  readText,
  type JsonRecord,
} from "./json-values";

/**
 * 读出登录里的网址, 去掉空的, 保持顺序.
 * @param login Bitwarden 条目的 login 对象.
 * @returns 网址列表.
 */
function readUrls(login: JsonRecord): readonly string[] {
  return readArray(login, "uris")
    .filter(isJsonRecord)
    .map((uri) => readText(uri, "uri"))
    .filter(isFilled);
}

/**
 * 把 Bitwarden 的登录 (type 1) 映射成登录类型: 用户名, 密码, 第一个网址与 TOTP 对应登录的账号,
 * 密码, 网址与 TOTP, 其余网址写成自定义字段, 通行密钥带不进.
 * @param item Bitwarden 条目.
 * @returns 登录类型的内容.
 */
export function mapLogin(item: JsonRecord): TypedFragment {
  const login = readRecord(item, "login");
  const urls = splitUrls(readUrls(login));
  const losses: SourceLoss[] = [];
  if (readArray(login, "fido2Credentials").length > 0) {
    losses.push({ reason: "passkey-unsupported" });
  }
  return {
    typeKey: LOGIN_TYPE.key,
    fields: {
      account: readText(login, "username"),
      password: readText(login, "password"),
      url: urls.url,
    },
    notes: readText(item, "notes"),
    customFields: urls.extras,
    totp: readText(login, "totp"),
    losses,
  };
}
