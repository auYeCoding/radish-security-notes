import { AttachmentService } from "../attachments/attachment-service";
import type { AttachmentFile } from "../attachments/attachment-service";
import type { EntryService } from "../entries/entry-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  entryAttachmentContents,
  entryAttachments,
} from "../vault/database/attachment-schema";
import type { VaultService } from "../vault/vault-service";
import { createNamedEntries } from "./batch-service-fixture";
import { createEntryServiceFixture } from "./entry-service-fixture";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 测试里的一次附件服务环境.
 */
export interface AttachmentServiceFixture {
  /**
   * 被测的附件服务, 附件编号依次为 att-1, att-2.
   */
  readonly attachments: AttachmentService;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 同一个已解锁保险库上的附件服务与条目服务, 并建好一个条目.
 */
export interface AttachmentWorkspaceFixture extends AttachmentServiceFixture {
  /**
   * 保险库服务, 用来取数据库与模拟重启.
   */
  readonly vault: VaultService;
  /**
   * 条目服务, 编号依次为 id-1, id-2.
   */
  readonly entries: EntryService;
  /**
   * 已建好的第一个条目的编号.
   */
  readonly entryId: string;
}

/**
 * 在保险库服务之上创建附件服务, 编号依次为 att-1, att-2.
 * @param vault 保险库服务.
 * @param getOrm 覆盖取数据库的方法, 默认取保险库服务的数据库.
 * @returns 附件服务环境.
 */
export function createAttachmentServiceFixture(
  vault: VaultService,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): AttachmentServiceFixture {
  const failures: unknown[] = [];
  let counter = 0;
  const attachments = new AttachmentService({
    getOrm,
    createIdentifier: () => `att-${(counter += 1)}`,
    onFailure: (error) => failures.push(error),
  });
  return { attachments, failures };
}

/**
 * 在已解锁的保险库上创建附件服务与条目服务, 并建好第一个条目 id-1.
 * @param vault 已解锁的保险库服务.
 * @returns 附件工作环境.
 */
export function createAttachmentWorkspace(
  vault: VaultService,
): AttachmentWorkspaceFixture {
  const entries = createEntryServiceFixture(vault).entries;
  const [entryId = ""] = createNamedEntries(entries, ["条目"]);
  return { ...createAttachmentServiceFixture(vault), vault, entries, entryId };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建附件工作环境.
 * @param harness 保险库服务测试环境.
 * @returns 附件工作环境.
 */
export async function createUnlockedAttachmentFixture(
  harness: VaultServiceHarness,
): Promise<AttachmentWorkspaceFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createAttachmentWorkspace(vault);
}

/**
 * 构造一个待写库的附件文件.
 * @param name 文件名.
 * @param bytes 文件的字节.
 * @returns 附件文件.
 */
export function fileOf(
  name: string,
  bytes: readonly number[] | number,
): AttachmentFile {
  return {
    name,
    content:
      typeof bytes === "number" ? Buffer.alloc(bytes, 7) : Buffer.from(bytes),
  };
}

/**
 * 取已解锁保险库的数据库.
 * @param vault 保险库服务.
 * @returns 数据库的查询入口.
 * @throws Error 当保险库未解锁时.
 */
function requireOrm(vault: VaultService): VaultOrm {
  const orm = vault.getOrm();
  if (orm === undefined) {
    throw new Error("保险库未解锁");
  }
  return orm;
}

/**
 * 附件元数据表与内容表里各自存着的附件编号.
 */
export interface StoredAttachmentIds {
  /**
   * 元数据表里的附件编号, 按编号排序.
   */
  readonly metadata: readonly string[];
  /**
   * 内容表里的附件编号, 按编号排序.
   */
  readonly contents: readonly string[];
}

/**
 * 读出附件元数据表与内容表里的附件编号.
 * @param vault 已解锁的保险库服务.
 * @returns 两张表里各自的附件编号, 按编号排序.
 */
export function listStoredAttachmentIds(
  vault: VaultService,
): StoredAttachmentIds {
  const orm = requireOrm(vault);
  const metadata = orm
    .select({ id: entryAttachments.id })
    .from(entryAttachments)
    .all()
    .map((row) => row.id)
    .sort();
  const contents = orm
    .select({ id: entryAttachmentContents.attachmentId })
    .from(entryAttachmentContents)
    .all()
    .map((row) => row.id)
    .sort();
  return { metadata, contents };
}
