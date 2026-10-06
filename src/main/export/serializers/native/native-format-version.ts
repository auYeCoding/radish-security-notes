/**
 * 本应用完整格式 (同时是备份与恢复格式) 在 `manifest.json` 里的格式标识.
 */
export const NATIVE_FORMAT_ID = "radish-security-notes-export";

/**
 * 本应用完整格式当前的版本号. 恢复时按它判断能否读取, 格式有不兼容的改动时加一.
 */
export const NATIVE_FORMAT_VERSION = 1;

/**
 * 压缩包里清单文件的路径.
 */
export const NATIVE_MANIFEST_PATH = "manifest.json";

/**
 * 压缩包里保险库数据文件的路径.
 */
export const NATIVE_VAULT_PATH = "vault.json";

/**
 * 压缩包里附件所在目录的名称.
 */
export const NATIVE_ATTACHMENT_DIRECTORY = "attachments";

/**
 * 附件编号允许的字符, 编号直接用作压缩包里的文件名, 不得含路径分隔符与点号序列.
 */
const ATTACHMENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * 附件内容在压缩包里的路径. 用附件编号命名, 附件的原名称只记在 `vault.json` 里, 这样非法的文件名
 * 字符与重名都不会影响解压.
 * @param attachmentId 附件编号.
 * @returns 压缩包里的路径, 如 `attachments/att-1`.
 * @throws Error 当编号含有不能用作文件名的字符时.
 */
export function nativeAttachmentPath(attachmentId: string): string {
  if (!isNativeAttachmentId(attachmentId)) {
    throw new Error("附件编号含有不能用作文件名的字符");
  }
  return `${NATIVE_ATTACHMENT_DIRECTORY}/${attachmentId}`;
}

/**
 * 判断一个附件编号能否用作压缩包里的文件名.
 * @param attachmentId 附件编号.
 * @returns 编号只含字母, 数字, 下划线与连字符时为 true.
 */
export function isNativeAttachmentId(attachmentId: string): boolean {
  return ATTACHMENT_ID_PATTERN.test(attachmentId);
}

/**
 * 由压缩包里附件内容的路径取出附件编号, 是 `nativeAttachmentPath` 的逆运算.
 * @param path 压缩包里的路径.
 * @returns 附件编号; 路径不在附件目录下, 或编号含有不能用作文件名的字符时为 undefined.
 */
export function attachmentIdOfPath(path: string): string | undefined {
  const prefix = `${NATIVE_ATTACHMENT_DIRECTORY}/`;
  if (!path.startsWith(prefix)) {
    return undefined;
  }
  const attachmentId = path.slice(prefix.length);
  return isNativeAttachmentId(attachmentId) ? attachmentId : undefined;
}
