import type {
  RestoreProgressSnapshot,
  RestoreStage,
} from "@shared/restore/restore-types";

/**
 * 恢复进度的记录器.
 */
export interface RestoreProgressTracker {
  /**
   * 进入一个阶段, 计数清零.
   * @param stage 新的阶段.
   */
  readonly begin: (stage: RestoreStage) => void;
  /**
   * 更新当前阶段的计数.
   * @param processed 已处理的个数.
   * @param total 要处理的总数, 未知时为 0.
   */
  readonly advance: (processed: number, total: number) => void;
  /**
   * 回到空闲状态.
   */
  readonly reset: () => void;
  /**
   * 读取当前进度的快照.
   * @returns 进度快照.
   */
  readonly snapshot: () => RestoreProgressSnapshot;
}

/**
 * 空闲状态的进度快照.
 */
const IDLE_SNAPSHOT: RestoreProgressSnapshot = {
  stage: "idle",
  processed: 0,
  total: 0,
};

/**
 * 创建恢复进度的记录器, 初始是空闲状态.
 * @returns 进度记录器.
 */
export function createRestoreProgressTracker(): RestoreProgressTracker {
  let current = IDLE_SNAPSHOT;
  return {
    begin: (stage) => {
      current = { stage, processed: 0, total: 0 };
    },
    advance: (processed, total) => {
      current = { stage: current.stage, processed, total };
    },
    reset: () => {
      current = IDLE_SNAPSHOT;
    },
    snapshot: () => current,
  };
}
