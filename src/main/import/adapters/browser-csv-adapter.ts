import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import { createCsvAdapter } from "../csv-source-adapter";
import { IMPORT_CUSTOM_FIELD_LABELS } from "../import-custom-field-labels";
import {
  customFieldIfFilled,
  emptyDraft,
  isFilled,
} from "../import-draft-builders";
import type {
  ImportedEntryDraft,
  ImportSourceAdapter,
} from "../source-adapter";

/**
 * 取网址的主机名, 作没有名称列时的条目名称.
 * @param url 网址.
 * @returns 主机名; 网址解析不出主机名 (例如没有协议) 时为整个网址.
 */
function hostOrWhole(url: string): string {
  try {
    const { hostname } = new URL(url.trim());
    return hostname.length > 0 ? hostname : url.trim();
  } catch {
    return url.trim();
  }
}

/**
 * 把浏览器导出的一行映射成登录草稿: name 与 note 列 (Chrome, Edge) 有就用, 没有名称列
 * (Firefox) 时用网址主机名作名称; Firefox 的 httpRealm 写成自定义字段. 创建时间, guid 等元数据
 * 不是用户内容, 不带入也不进清单.
 * @param record 一行记录.
 * @returns 草稿.
 */
function mapRecord(
  record: Readonly<Record<string, string>>,
): ImportedEntryDraft {
  const named = isFilled(record.name ?? "");
  const base = emptyDraft(
    named ? record.name : hostOrWhole(record.url),
    LOGIN_TYPE.key,
  );
  return {
    ...base,
    fields: {
      account: record.username,
      password: record.password,
      url: record.url,
    },
    notes: record.note ?? "",
    customFields: customFieldIfFilled(
      IMPORT_CUSTOM_FIELD_LABELS.httpRealm,
      record.httpRealm ?? "",
      false,
    ),
  };
}

/**
 * 浏览器密码 CSV 的适配器, 覆盖 Chrome 与 Edge 的 name,url,username,password,note, 以及 Firefox 的
 * url,username,password,httpRealm,formActionOrigin,guid 与三个时间列; 只要有 url, username,
 * password 三列 (区分大小写) 就能识别, 其余列可有可无. 浏览器密码只有登录.
 */
export const browserCsvAdapter: ImportSourceAdapter = createCsvAdapter({
  key: "browserCsv",
  requiredColumns: ["url", "username", "password"],
  mapRecord,
});
