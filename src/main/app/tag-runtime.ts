import { randomUUID } from "node:crypto";

import { TagService } from "../tags/tag-service";
import type { VaultService } from "../vault/vault-service";
import { reportFailureName } from "./report-failure-name";

/**
 * 标签失败日志的前缀.
 */
const TAG_FAILURE_SCOPE = "标签";

/**
 * 创建标签服务: 读写保险库已解锁的加密数据库.
 * @param vault 保险库服务.
 * @returns 标签服务.
 */
export function createTagService(vault: VaultService): TagService {
  return new TagService({
    getOrm: () => vault.getOrm(),
    createIdentifier: randomUUID,
    now: Date.now,
    onFailure: (error) => reportFailureName(TAG_FAILURE_SCOPE, error),
  });
}
