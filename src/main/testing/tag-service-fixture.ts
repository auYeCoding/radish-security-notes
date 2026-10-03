import type { EntryService } from "../entries/entry-service";
import { TagService } from "../tags/tag-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import { createEntryServiceFixture } from "./entry-service-fixture";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 测试里的一次标签服务环境.
 */
export interface TagServiceFixture {
  /**
   * 被测的标签服务.
   */
  readonly tags: TagService;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 在保险库服务之上创建标签服务, 编号依次为 tag-1, tag-2, 时间依次递增.
 * @param vault 保险库服务.
 * @param getOrm 覆盖取数据库的方法, 默认取保险库服务的数据库.
 * @returns 标签服务环境.
 */
export function createTagServiceFixture(
  vault: VaultService,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): TagServiceFixture {
  const failures: unknown[] = [];
  let counter = 0;
  const tags = new TagService({
    getOrm,
    createIdentifier: () => `tag-${(counter += 1)}`,
    now: () => 3000 + counter,
    onFailure: (error) => failures.push(error),
  });
  return { tags, failures };
}

/**
 * 同一个已解锁保险库上的标签服务与条目服务.
 */
export interface TagAndEntryFixture extends TagServiceFixture {
  /**
   * 条目服务, 编号依次为 id-1, id-2.
   */
  readonly entries: EntryService;
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建标签服务与条目服务.
 * @param harness 保险库服务测试环境.
 * @returns 两个服务.
 */
export async function createUnlockedTagAndEntryFixture(
  harness: VaultServiceHarness,
): Promise<TagAndEntryFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return {
    ...createTagServiceFixture(vault),
    entries: createEntryServiceFixture(vault).entries,
  };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建标签服务环境.
 * @param harness 保险库服务测试环境.
 * @returns 标签服务环境.
 */
export async function createUnlockedTagFixture(
  harness: VaultServiceHarness,
): Promise<TagServiceFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createTagServiceFixture(vault);
}
