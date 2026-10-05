import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import { createCsvAdapter } from "../csv-source-adapter";
import { emptyDraft } from "../import-draft-builders";
import { FOLDER_PATH_SEPARATOR } from "../import-folder-path";
import type {
  ImportedEntryDraft,
  ImportSourceAdapter,
} from "../source-adapter";

/**
 * 去掉 KeePassXC 导出的分组路径里的根组名: 路径第一段是数据库的根组, 本应用没有对应的层级.
 * @param group 导出的分组路径, 层级用 `/` 连接.
 * @returns 去掉根组后的路径, 条目直接在根组里时为空串.
 */
function withoutRootGroup(group: string): string {
  const [, ...rest] = group.split(FOLDER_PATH_SEPARATOR);
  return rest.join(FOLDER_PATH_SEPARATOR);
}

/**
 * 把 KeePassXC CSV 的一行映射成登录草稿: Title, Username, Password, URL, Notes 对应名称, 账号,
 * 密码, 网址与备注, TOTP 列是 otpauth 链接. 图标, 修改时间与创建时间是元数据, 不带入也不进清单.
 * @param record 一行记录.
 * @returns 草稿.
 */
function mapRecord(
  record: Readonly<Record<string, string>>,
): ImportedEntryDraft {
  const base = emptyDraft(record.Title, LOGIN_TYPE.key);
  return {
    ...base,
    fields: {
      account: record.Username,
      password: record.Password,
      url: record.URL,
    },
    notes: record.Notes,
    totp: record.TOTP ?? "",
    folderPath: withoutRootGroup(record.Group),
  };
}

/**
 * KeePassXC CSV 的适配器. 表头是 Group,Title,Username,Password,URL,Notes,TOTP,Icon,Last
 * Modified,Created, 列名区分大小写; 分组路径含根组名, 导入时去掉根组名后用剩下的路径作文件夹.
 */
export const keepassxcCsvAdapter: ImportSourceAdapter = createCsvAdapter({
  key: "keepassxcCsv",
  requiredColumns: ["Group", "Title", "Username", "Password", "URL", "Notes"],
  mapRecord,
});
