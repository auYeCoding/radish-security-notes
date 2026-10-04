import { BatchService } from "../batch/batch-service";
import type { VaultService } from "../vault/vault-service";
import { reportFailureName } from "./report-failure-name";

/**
 * 批量操作失败日志的前缀.
 */
const BATCH_FAILURE_SCOPE = "批量操作";

/**
 * 创建批量服务: 读写保险库已解锁的加密数据库.
 * @param vault 保险库服务.
 * @returns 批量服务.
 */
export function createBatchService(vault: VaultService): BatchService {
  return new BatchService({
    getOrm: () => vault.getOrm(),
    onFailure: (error) => reportFailureName(BATCH_FAILURE_SCOPE, error),
  });
}
