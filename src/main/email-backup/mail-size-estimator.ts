/**
 * base64 编码后每行的字符数, nodemailer 默认折行长度.
 */
const BASE64_LINE_LENGTH = 76;

/**
 * 每个折行的换行符 (CRLF) 字节数.
 */
const BASE64_LINE_BREAK_BYTES = 2;

/**
 * 邮件头, 正文, 分隔线等封装开销的估计字节数, 真实开销通常不到 2 KiB, 取大一些宁可多估.
 */
export const MAIL_ENVELOPE_OVERHEAD_BYTES = 16 * 1024;

/**
 * 估计带一个附件的邮件在传输时的字节数: 附件按 base64 编码膨胀到 4/3, 按每行 76 个字符折行加换行,
 * 再加封装开销. 邮箱厂商限制的是整封邮件, 所以不能只比较文件本身的大小.
 * @param attachmentBytes 附件文件的字节数.
 * @returns 估计的邮件字节数.
 */
export function estimateMailSizeBytes(attachmentBytes: number): number {
  const encodedBytes = Math.ceil(attachmentBytes / 3) * 4;
  const lineBreakBytes =
    Math.ceil(encodedBytes / BASE64_LINE_LENGTH) * BASE64_LINE_BREAK_BYTES;
  return encodedBytes + lineBreakBytes + MAIL_ENVELOPE_OVERHEAD_BYTES;
}
