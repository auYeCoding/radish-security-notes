import type {
  ImportProgressSnapshot,
  ImportStage,
} from "@shared/import/import-types";

/**
 * 处理过程中每隔多少个条目让出一次事件循环并更新进度.
 */
export const IMPORT_CHUNK_SIZE = 250;

/**
 * 导入被用户取消时抛出的错误, 由服务接住并按取消处理.
 */
export class ImportCancelledError extends Error {
  /**
   * 创建取消错误.
   */
  constructor() {
    super("导入已取消");
    this.name = "ImportCancelledError";
  }
}

/**
 * 导入进度的记录器.
 */
export interface ImportProgressTracker {
  /**
   * 进入一个阶段, 计数清零.
   * @param stage 新的阶段.
   */
  readonly begin: (stage: ImportStage) => void;
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
  readonly snapshot: () => ImportProgressSnapshot;
}

/**
 * 创建进度记录器, 初始是空闲状态.
 * @returns 进度记录器.
 */
export function createProgressTracker(): ImportProgressTracker {
  let current: ImportProgressSnapshot = {
    stage: "idle",
    processed: 0,
    total: 0,
  };
  return {
    begin: (stage) => {
      current = { stage, processed: 0, total: 0 };
    },
    advance: (processed, total) => {
      current = { stage: current.stage, processed, total };
    },
    reset: () => {
      current = { stage: "idle", processed: 0, total: 0 };
    },
    snapshot: () => current,
  };
}

/**
 * 分块处理的观察者: 适配器与规划器每处理一个条目就调用一次.
 */
export interface ChunkObserver {
  /**
   * 报告已处理的个数, 每处理完一块就让出事件循环, 用户取消后抛出 `ImportCancelledError`.
   * @param processed 已处理的个数.
   * @param total 要处理的总数, 未知时为 0.
   * @returns 让出事件循环 (如果需要) 之后兑现.
   */
  readonly advance: (processed: number, total: number) => Promise<void>;
}

/**
 * 创建分块观察者的依赖.
 */
export interface ChunkObserverDependencies {
  /**
   * 进度记录器.
   */
  readonly tracker: ImportProgressTracker;
  /**
   * 让出事件循环, 让进度轮询等请求有机会被处理.
   */
  readonly yieldToEventLoop: () => Promise<void>;
  /**
   * 判断用户是否已取消.
   */
  readonly isCancelled: () => boolean;
  /**
   * 每块的条目个数, 默认是 `IMPORT_CHUNK_SIZE`.
   */
  readonly chunkSize?: number;
}

/**
 * 创建分块观察者: 更新进度, 检查取消, 每处理完一块让出一次事件循环.
 * @param dependencies 观察者的依赖.
 * @returns 分块观察者.
 */
export function createChunkObserver(
  dependencies: ChunkObserverDependencies,
): ChunkObserver {
  const { tracker, yieldToEventLoop, isCancelled } = dependencies;
  const chunkSize = dependencies.chunkSize ?? IMPORT_CHUNK_SIZE;
  return {
    advance: async (processed, total) => {
      tracker.advance(processed, total);
      if (isCancelled()) {
        throw new ImportCancelledError();
      }
      if (processed > 0 && processed % chunkSize === 0) {
        await yieldToEventLoop();
      }
    },
  };
}

/**
 * 基于 `setImmediate` 的让出事件循环的实现.
 * @returns 下一轮事件循环时兑现.
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
