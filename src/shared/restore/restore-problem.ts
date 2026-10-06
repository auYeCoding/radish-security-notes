/**
 * 备份内容不合规时问题所在的区段.
 */
export type RestoreProblemSection =
  | "manifest"
  | "archive"
  | "folders"
  | "tags"
  | "customTypes"
  | "entries"
  | "attachments";

/**
 * 备份内容不合规或超过上限的原因代码, 只描述问题的种类, 不含任何备份里的内容.
 */
export type RestoreProblemCode =
  | "wrong-shape"
  | "duplicate-id"
  | "duplicate-name"
  | "invalid-value"
  | "unknown-reference"
  | "count-mismatch"
  | "unexpected-file"
  | "duplicate-file"
  | "missing-file"
  | "size-mismatch"
  | "too-many-files"
  | "too-large"
  | "too-many-entries";

/**
 * 校验发现的第一个问题. 位置序号从 1 起, 指向区段里的第几项, 与具体某项无关时没有这一项.
 */
export interface RestoreProblem {
  /**
   * 问题所在的区段.
   */
  readonly section: RestoreProblemSection;
  /**
   * 问题的原因代码.
   */
  readonly code: RestoreProblemCode;
  /**
   * 区段里出问题的是第几项, 从 1 起.
   */
  readonly position?: number;
}

/**
 * 构造一个校验问题.
 * @param section 问题所在的区段.
 * @param code 问题的原因代码.
 * @param position 区段里出问题的是第几项, 从 1 起, 与具体某项无关时省略.
 * @returns 校验问题.
 */
export function restoreProblem(
  section: RestoreProblemSection,
  code: RestoreProblemCode,
  position?: number,
): RestoreProblem {
  return position === undefined
    ? { section, code }
    : { section, code, position };
}
