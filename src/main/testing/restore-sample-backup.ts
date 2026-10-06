import { expect } from "vitest";

import type {
  RestoreProblemCode,
  RestoreProblemSection,
} from "@shared/restore/restore-problem";
import type { RestoreFailure } from "@shared/restore/restore-result";

import type { RawBackupArchive } from "../restore/backup-archive-reader";
import { validateBackup } from "../restore/restore-backup-validator";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { exportSampleAsNative, type ParsedJson } from "./native-export-fixture";
import type { ZipTestFile } from "./zip-test-writer";

/**
 * 可以逐处改动的备份样本: 清单与保险库数据是解析出的 JSON, 附件是字节.
 */
export interface SampleBackup {
  /**
   * 清单, 可以改动.
   */
  readonly manifest: ParsedJson;
  /**
   * 保险库数据, 可以改动.
   */
  readonly vault: ParsedJson;
  /**
   * 附件内容, 键是附件编号, 可以改动.
   */
  readonly attachments: Map<string, Buffer>;
}

/**
 * 压缩包里附件文件路径的前缀.
 */
const ATTACHMENT_PREFIX = "attachments/";

/**
 * 用真实的本应用格式序列化器写入样例并序列化, 解出清单, 保险库数据与附件, 作为校验测试的
 * 合规起点. 各校验测试在它的基础上改出一处不合规.
 * @param orm 空的已解锁数据库的查询入口.
 * @returns 备份样本.
 */
export async function loadSampleBackup(orm: VaultOrm): Promise<SampleBackup> {
  const exported = await exportSampleAsNative(orm);
  const [manifestFile, vaultFile, ...attachmentFiles] = exported.entries;
  return {
    manifest: JSON.parse(manifestFile?.content.toString("utf8") ?? ""),
    vault: JSON.parse(vaultFile?.content.toString("utf8") ?? ""),
    attachments: new Map(
      attachmentFiles.map((file) => [
        file.name.slice(ATTACHMENT_PREFIX.length),
        file.content,
      ]),
    ),
  };
}

/**
 * 深拷贝一个备份样本, 一个测试里要从同一个合规起点改出多种不合规时, 每种用一份拷贝, 不必重复写入
 * 样例.
 * @param backup 备份样本.
 * @returns 互不影响的拷贝.
 */
export function cloneSampleBackup(backup: SampleBackup): SampleBackup {
  return {
    manifest: JSON.parse(JSON.stringify(backup.manifest)),
    vault: JSON.parse(JSON.stringify(backup.vault)),
    attachments: new Map(
      [...backup.attachments].map(([id, content]) => [
        id,
        Buffer.from(content),
      ]),
    ),
  };
}

/**
 * 按保险库数据里实际的个数改写清单里的计数, 测试改动结构之后调用, 避免清单计数先于要测的问题
 * 被发现.
 * @param backup 备份样本.
 */
export function syncManifestCounts(backup: SampleBackup): void {
  const { vault } = backup;
  backup.manifest.counts = {
    entries: vault.entries.length,
    folders: vault.folders.length,
    tags: vault.tags.length,
    customEntryTypes: vault.customEntryTypes.length,
    attachments: vault.entries.reduce(
      (total: number, entry: ParsedJson) => total + entry.attachments.length,
      0,
    ),
  };
}

/**
 * 把备份样本转成从压缩包读出的内容.
 * @param backup 备份样本.
 * @returns 压缩包的内容.
 */
export function toRawArchive(backup: SampleBackup): RawBackupArchive {
  return {
    manifest: Buffer.from(JSON.stringify(backup.manifest), "utf8"),
    vault: Buffer.from(JSON.stringify(backup.vault), "utf8"),
    attachments: backup.attachments,
  };
}

/**
 * 把备份样本写成压缩包里的文件列表: 清单与保险库数据 deflate 压缩, 附件仅存储, 与真实备份一致.
 * @param backup 备份样本.
 * @returns 压缩包里的文件, 可以再追加或改动后交给 `writeZip`.
 */
export function toZipFiles(backup: SampleBackup): ZipTestFile[] {
  return [
    {
      name: "manifest.json",
      content: Buffer.from(JSON.stringify(backup.manifest), "utf8"),
      method: "deflate",
    },
    {
      name: "vault.json",
      content: Buffer.from(JSON.stringify(backup.vault), "utf8"),
      method: "deflate",
    },
    ...[...backup.attachments].map(([id, content]): ZipTestFile => ({
      name: `attachments/${id}`,
      content,
    })),
  ];
}

/**
 * 引用样本里另一处的值: 把另一处现在的值复制过来, 用来造 "与某个值重复" 的不合规.
 */
export interface CopyOf {
  /**
   * 要复制的值所在的路径.
   */
  readonly copyFrom: string;
}

/**
 * 一处数据化的改动: 把若干路径上的值改掉, 与期望的问题原因代码和序号. 路径从样本根开始, 用
 * 点号分隔, 数字段是数组下标, 例如 `vault.folders.2.id`.
 */
export interface ProblemCase {
  /**
   * 要改的路径与新值, 新值是 `CopyOf` 时复制另一处的值.
   */
  readonly set: Readonly<Record<string, unknown>>;
  /**
   * 期望的问题原因代码.
   */
  readonly code: RestoreProblemCode;
  /**
   * 期望的问题序号.
   */
  readonly position: number;
}

/**
 * 判断一个值是否是对另一处的引用.
 * @param value 新值.
 * @returns 是 `CopyOf` 时为 true.
 */
function isCopyOf(value: unknown): value is CopyOf {
  return typeof value === "object" && value !== null && "copyFrom" in value;
}

/**
 * 沿路径取出值所在的容器与最后一段键.
 * @param root 样本根.
 * @param path 点号分隔的路径.
 * @returns 容器与键.
 */
function locate(root: ParsedJson, path: string): [ParsedJson, string] {
  const keys = path.split(".");
  const last = keys.pop() ?? "";
  const container = keys.reduce((node: ParsedJson, key) => node[key], root);
  return [container, last];
}

/**
 * 按数据化的改动改写备份样本.
 * @param backup 备份样本.
 * @param set 路径到新值的映射.
 */
function assignPaths(
  backup: SampleBackup,
  set: Readonly<Record<string, unknown>>,
): void {
  for (const [path, value] of Object.entries(set)) {
    const [container, key] = locate(backup, path);
    if (isCopyOf(value)) {
      const [source, sourceKey] = locate(backup, value.copyFrom);
      container[key] = source[sourceKey];
    } else {
      container[key] = value;
    }
  }
}

/**
 * 逐个运行改动, 断言每个都被整体拒绝, 并且第一个问题是期望的区段, 原因代码与序号.
 * @param base 合规的备份样本.
 * @param section 期望的问题所在区段.
 * @param cases 改动与期望的问题.
 */
export function expectProblems(
  base: SampleBackup,
  section: RestoreProblemSection,
  cases: readonly ProblemCase[],
): void {
  for (const { set, code, position } of cases) {
    const mutate = (backup: SampleBackup): void => assignPaths(backup, set);
    expect(failureAfter(base, mutate)).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section, code, position },
    });
  }
}

/**
 * 在合规样本的一份拷贝上改出一处不合规, 同步清单计数后校验, 返回校验失败的结果.
 * @param base 合规的备份样本, 不被改动.
 * @param mutate 在拷贝上改动的函数.
 * @returns 校验失败的结果, 改动后仍然合规时为 undefined.
 */
export function failureAfter(
  base: SampleBackup,
  mutate: (backup: SampleBackup) => void,
): RestoreFailure | undefined {
  const backup = cloneSampleBackup(base);
  mutate(backup);
  syncManifestCounts(backup);
  const result = validateBackup(toRawArchive(backup));
  return result.ok ? undefined : result;
}
