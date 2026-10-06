import type { Readable } from "node:stream";

import type { RestoreLimits } from "@shared/restore/restore-limits";
import {
  restoreSucceeded,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type { Entry, ZipFile } from "yauzl";

import {
  checkArchiveEntries,
  checkArchiveEntryCount,
  classifyArchiveEntryName,
  type ArchiveEntryFacts,
} from "./backup-archive-policy";
import { BackupDamagedError } from "./restore-errors";

/**
 * 从压缩包里读出的全部内容, 都在内存里.
 */
export interface RawBackupArchive {
  /**
   * 清单文件 `manifest.json` 的字节.
   */
  readonly manifest: Buffer;
  /**
   * 保险库数据文件 `vault.json` 的字节.
   */
  readonly vault: Buffer;
  /**
   * 附件内容, 键是附件编号.
   */
  readonly attachments: ReadonlyMap<string, Buffer>;
}

/**
 * 读取压缩包过程中报告进度的回调.
 */
export type ArchiveProgressReporter = (
  processed: number,
  total: number,
) => void;

/**
 * 把压缩包条目的文件名字节按 UTF-8 解码成路径.
 * @param entry 压缩包条目, 打开时不解码文件名, 字节在 `fileNameRaw`.
 * @returns 路径文本.
 */
function nameOf(entry: Entry): string {
  return entry.fileNameRaw.toString("utf8");
}

/**
 * 取出一个条目在读取前就能知道的事实.
 * @param entry 压缩包条目.
 * @returns 条目的事实.
 */
function factsOf(entry: Entry): ArchiveEntryFacts {
  return {
    name: nameOf(entry),
    uncompressedSize: entry.uncompressedSize,
    isEncrypted: entry.isEncrypted(),
    compressionMethod: entry.compressionMethod,
  };
}

/**
 * 逐个列出压缩包里的全部条目, 只读中央目录, 不读任何文件内容.
 * @param zipFile 已打开的压缩包.
 * @returns 全部条目, 按中央目录里的顺序.
 * @throws BackupDamagedError 当中央目录不合法时.
 */
async function listEntries(zipFile: ZipFile): Promise<Entry[]> {
  const entries: Entry[] = [];
  try {
    for await (const entry of zipFile.eachEntry()) {
      entries.push(entry);
    }
  } catch (error) {
    throw new BackupDamagedError(error);
  }
  return entries;
}

/**
 * 把一个可读流整体读进内存.
 * @param stream 可读流.
 * @returns 全部字节.
 */
async function collectStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/**
 * 读出一个条目的全部内容. 打开时已要求校验实际字节数与声明一致, 超出声明的字节数时读取出错,
 * 所以解压出的字节数不会超过前面按声明检查过的上限.
 * @param zipFile 已打开的压缩包.
 * @param entry 要读的条目.
 * @returns 条目的内容.
 * @throws BackupDamagedError 当压缩数据损坏, 校验不过或字节数与声明不符时.
 */
async function readEntry(zipFile: ZipFile, entry: Entry): Promise<Buffer> {
  try {
    return await collectStream(await zipFile.openReadStreamPromise(entry));
  } catch (error) {
    throw new BackupDamagedError(error);
  }
}

/**
 * 把读出的内容按角色放进结果的各部分.
 */
interface ArchiveContents {
  /**
   * 清单字节.
   */
  manifest: Buffer | undefined;
  /**
   * 保险库数据字节.
   */
  vault: Buffer | undefined;
  /**
   * 附件内容.
   */
  readonly attachments: Map<string, Buffer>;
}

/**
 * 把一个条目的内容按路径对应的角色放好.
 * @param contents 已读出的内容.
 * @param name 条目的路径, 已通过白名单检查.
 * @param content 条目的内容.
 */
function place(contents: ArchiveContents, name: string, content: Buffer): void {
  const role = classifyArchiveEntryName(name);
  if (role?.kind === "manifest") {
    contents.manifest = content;
  } else if (role?.kind === "vault") {
    contents.vault = content;
  } else if (role?.kind === "attachment") {
    contents.attachments.set(role.attachmentId, content);
  }
}

/**
 * 读出备份压缩包的全部内容: 先只读中央目录并按白名单与上限整体检查, 通过后才逐个读出文件内容.
 * 全部在内存里完成, 不产生临时文件.
 * @param zipFile 已打开的压缩包, 读完后由调用方关闭.
 * @param limits 读取上限.
 * @param report 每读完一个文件调用一次的进度回调.
 * @returns 压缩包的内容; 不是备份文件, 内容不合规或超限时为失败结果.
 * @throws BackupDamagedError 当压缩包损坏时.
 */
export async function readBackupArchive(
  zipFile: ZipFile,
  limits: RestoreLimits,
  report: ArchiveProgressReporter,
): Promise<RestoreResult<RawBackupArchive>> {
  const countFailure = checkArchiveEntryCount(zipFile.entryCount, limits);
  if (countFailure !== undefined) {
    return countFailure;
  }
  const entries = await listEntries(zipFile);
  const failure = checkArchiveEntries(entries.map(factsOf), limits);
  if (failure !== undefined) {
    return failure;
  }
  const contents: ArchiveContents = {
    manifest: undefined,
    vault: undefined,
    attachments: new Map(),
  };
  report(0, entries.length);
  for (const [index, entry] of entries.entries()) {
    place(contents, nameOf(entry), await readEntry(zipFile, entry));
    report(index + 1, entries.length);
  }
  if (contents.manifest === undefined || contents.vault === undefined) {
    throw new BackupDamagedError(new Error("清单或保险库数据缺失"));
  }
  return restoreSucceeded({
    manifest: contents.manifest,
    vault: contents.vault,
    attachments: contents.attachments,
  });
}
