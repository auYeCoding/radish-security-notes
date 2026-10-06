/**
 * 备份文件的种类: 未加密的压缩包, 口令加密的 age 文件, 或都不是.
 */
export type BackupFileKind = "zip" | "encrypted" | "unknown";

/**
 * 判断种类需要读取的文件开头字节数, 够放下最长的魔数.
 */
export const BACKUP_FILE_HEAD_BYTES = 32;

/**
 * 压缩包文件开头的魔数: 第一个本地文件头的签名.
 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * age 加密文件开头的魔数, 即二进制格式第一行的版本声明.
 */
const AGE_MAGIC = Buffer.from("age-encryption.org/v1\n", "ascii");

/**
 * 判断文件开头是否以某个魔数开始.
 * @param head 文件开头的字节.
 * @param magic 魔数.
 * @returns 以魔数开始时为 true.
 */
function startsWith(head: Buffer, magic: Buffer): boolean {
  return (
    head.length >= magic.length && head.subarray(0, magic.length).equals(magic)
  );
}

/**
 * 按文件开头的内容判断备份文件的种类, 不看扩展名.
 * @param head 文件开头的字节.
 * @returns 文件的种类.
 */
export function detectBackupFileKind(head: Buffer): BackupFileKind {
  if (startsWith(head, ZIP_MAGIC)) {
    return "zip";
  }
  if (startsWith(head, AGE_MAGIC)) {
    return "encrypted";
  }
  return "unknown";
}
