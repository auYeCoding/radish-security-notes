import type {
  ExportProgressSnapshot,
  ExportStage,
} from "@shared/export/export-types";

/**
 * 导出进度的记录器.
 */
export interface ExportProgressTracker {
  /**
   * 进入一个阶段, 计数清零.
   * @param stage 新的阶段.
   */
  readonly begin: (stage: ExportStage) => void;
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
  readonly snapshot: () => ExportProgressSnapshot;
}

/**
 * 空闲状态的进度.
 */
const IDLE_PROGRESS: ExportProgressSnapshot = {
  stage: "idle",
  processed: 0,
  total: 0,
};

/**
 * 创建进度记录器, 初始是空闲状态.
 * @returns 进度记录器.
 */
export function createExportProgressTracker(): ExportProgressTracker {
  let current: ExportProgressSnapshot = IDLE_PROGRESS;
  return {
    begin: (stage) => {
      current = { stage, processed: 0, total: 0 };
    },
    advance: (processed, total) => {
      current = { stage: current.stage, processed, total };
    },
    reset: () => {
      current = IDLE_PROGRESS;
    },
    snapshot: () => current,
  };
}
