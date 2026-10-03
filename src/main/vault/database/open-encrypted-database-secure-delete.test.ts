import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { decryptDatabasePages } from "../../testing/decrypt-database-pages";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { openEncryptedDatabase } from "./open-encrypted-database";

/**
 * SQLite 的 `secure_delete` 取值: 1 表示删除时把被删内容覆写为零.
 */
const SECURE_DELETE_ENABLED_VALUE = 1;

/**
 * 被删记录的内容前缀, 后面接一段随机十六进制, 避免偶然撞上文件里的其它字节.
 */
const DELETED_MARKER_PREFIX = "deleted-marker-";

/**
 * 保留记录的内容前缀, 后面接一段随机十六进制.
 */
const KEPT_MARKER_PREFIX = "kept-marker-";

/**
 * 随机十六进制文本的字节数.
 */
const MARKER_RANDOM_BYTES = 16;

/**
 * 数据密钥的字节数.
 */
const DATA_KEY_BYTES = 32;

/**
 * 一对标记文本: 被删记录的内容与保留记录的内容.
 */
interface Markers {
  /**
   * 被删记录的内容.
   */
  readonly deleted: string;
  /**
   * 保留记录的内容.
   */
  readonly kept: string;
}

/**
 * 生成一个带随机后缀的标记文本.
 * @param prefix 标记前缀.
 * @returns 标记文本.
 */
function createMarker(prefix: string): string {
  return `${prefix}${randomBytes(MARKER_RANDOM_BYTES).toString("hex")}`;
}

/**
 * 生成一对新的标记文本.
 * @returns 被删记录与保留记录的标记文本.
 */
function createMarkers(): Markers {
  return {
    deleted: createMarker(DELETED_MARKER_PREFIX),
    kept: createMarker(KEPT_MARKER_PREFIX),
  };
}

/**
 * 在一个新加密数据库里写入被删记录与保留记录, 删除前者, 关闭后逐页解密文件.
 * @param directory 存放数据库文件的目录.
 * @param isSecureDeleteEnabled 删除前是否保持 `secure_delete` 开启.
 * @param markers 被删记录与保留记录的标记文本.
 * @returns 数据库文件的全部页明文.
 */
function deleteThenDecrypt(
  directory: string,
  isSecureDeleteEnabled: boolean,
  markers: Markers,
): Buffer {
  const dataKey = randomBytes(DATA_KEY_BYTES);
  const databaseFile = join(directory, "vault.db");
  const client = openEncryptedDatabase(databaseFile, dataKey);
  if (!isSecureDeleteEnabled) {
    client.pragma("secure_delete = OFF");
  }
  client.exec("create table notes (id integer primary key, body text)");
  client.prepare("insert into notes (body) values (?)").run(markers.deleted);
  client.prepare("insert into notes (body) values (?)").run(markers.kept);
  client.prepare("delete from notes where body = ?").run(markers.deleted);
  client.close();
  return decryptDatabasePages(databaseFile, dataKey);
}

describe("openEncryptedDatabase 删除残留", () => {
  const getDirectory = useTemporaryDirectory("encrypted-database-delete");

  it("打开时开启 secure_delete", () => {
    const client = openEncryptedDatabase(
      join(getDirectory(), "vault.db"),
      randomBytes(DATA_KEY_BYTES),
    );

    const secureDelete = client.pragma("secure_delete", { simple: true });
    client.close();

    expect(secureDelete).toBe(SECURE_DELETE_ENABLED_VALUE);
  });

  it("开启 secure_delete 时, 被删记录的内容不残留在数据库页里", () => {
    const markers = createMarkers();

    const pages = deleteThenDecrypt(getDirectory(), true, markers);

    expect(pages.includes(markers.kept)).toBe(true);
    expect(pages.includes(markers.deleted)).toBe(false);
  });

  it("对照: 关闭 secure_delete 时, 被删记录的内容仍残留在数据库页里", () => {
    const markers = createMarkers();

    const pages = deleteThenDecrypt(getDirectory(), false, markers);

    expect(pages.includes(markers.kept)).toBe(true);
    expect(pages.includes(markers.deleted)).toBe(true);
  });
});
