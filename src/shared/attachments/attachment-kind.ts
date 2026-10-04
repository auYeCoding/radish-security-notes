import { MAX_PREVIEW_BYTES } from "./attachment-limits";

/**
 * 附件按扩展名划分的类别: 图片, 系统会直接运行的可执行类, 其它.
 */
export type AttachmentKind = "image" | "executable" | "other";

/**
 * 可以在应用内预览的图片扩展名与对应的 MIME 类型, 不含 svg.
 */
const PREVIEW_MIME_BY_EXTENSION: ReadonlyMap<string, string> = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["gif", "image/gif"],
  ["webp", "image/webp"],
  ["bmp", "image/bmp"],
]);

/**
 * 系统打开时会直接运行的文件扩展名, 这类附件只能另存为, 不能用系统默认程序打开.
 */
const EXECUTABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "msp",
  "scr",
  "ps1",
  "vbs",
  "vbe",
  "js",
  "jse",
  "wsf",
  "wsh",
  "hta",
  "lnk",
  "url",
  "reg",
  "cpl",
  "jar",
  "pif",
]);

/**
 * 匹配名称末尾的点与空格, Windows 解析文件名时会忽略它们.
 */
const TRAILING_DOTS_AND_SPACES = /[. ]+$/;

/**
 * 取文件名的扩展名: 小写, 不含点; 没有扩展名, 或名称只是以点开头的隐藏文件名时为空串.
 * @param name 文件名.
 * @returns 扩展名.
 */
export function readExtension(name: string): string {
  const trimmed = name.replace(TRAILING_DOTS_AND_SPACES, "");
  const dotIndex = trimmed.lastIndexOf(".");
  return dotIndex > 0 ? trimmed.slice(dotIndex + 1).toLowerCase() : "";
}

/**
 * 按扩展名给附件分类, 可执行类优先于图片类.
 * @param name 附件名称.
 * @returns 附件类别.
 */
export function classifyAttachment(name: string): AttachmentKind {
  const extension = readExtension(name);
  if (EXECUTABLE_EXTENSIONS.has(extension)) {
    return "executable";
  }
  return PREVIEW_MIME_BY_EXTENSION.has(extension) ? "image" : "other";
}

/**
 * 判断附件能否用系统默认程序打开: 可执行类不能.
 * @param name 附件名称.
 * @returns 能打开时为 true.
 */
export function canOpenAttachment(name: string): boolean {
  return classifyAttachment(name) !== "executable";
}

/**
 * 取图片附件预览用的 MIME 类型.
 * @param name 附件名称.
 * @returns 可预览图片的 MIME 类型, 不是可预览的图片时为 undefined.
 */
export function previewMimeType(name: string): string | undefined {
  return classifyAttachment(name) === "image"
    ? PREVIEW_MIME_BY_EXTENSION.get(readExtension(name))
    : undefined;
}

/**
 * 判断附件能否在应用内预览: 是可预览的图片, 且不超过预览大小上限.
 * @param name 附件名称.
 * @param size 附件字节数.
 * @returns 能预览时为 true.
 */
export function canPreviewAttachment(name: string, size: number): boolean {
  return previewMimeType(name) !== undefined && size <= MAX_PREVIEW_BYTES;
}
