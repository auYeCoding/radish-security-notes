import { randomUUID } from "node:crypto";

import { CustomEntryTypeService } from "../entry-types/custom-entry-type-service";
import type { VaultService } from "../vault/vault-service";
import { reportFailureName } from "./report-failure-name";

/**
 * 自定义条目类型失败日志的前缀.
 */
const ENTRY_TYPE_FAILURE_SCOPE = "自定义类型";

/**
 * 创建自定义类型服务: 读写保险库已解锁的加密数据库. 失败时只记录错误名, 不记录类型名称与字段名.
 * @param vault 保险库服务.
 * @returns 自定义类型服务.
 */
export function createCustomEntryTypeService(
  vault: VaultService,
): CustomEntryTypeService {
  return new CustomEntryTypeService({
    getOrm: () => vault.getOrm(),
    createIdentifier: randomUUID,
    now: Date.now,
    onFailure: (error) => reportFailureName(ENTRY_TYPE_FAILURE_SCOPE, error),
  });
}
