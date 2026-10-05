import { ExportCancelledError } from "../export-errors";
import type { ExportSerializeContext } from "./export-serializer";

/**
 * 处理过程中每隔多少步让出一次事件循环.
 */
export const EXPORT_CHUNK_SIZE = 250;

/**
 * 分块节奏器: 序列化器每完成一步调用一次 `tick`.
 */
export interface ChunkPacer {
  /**
   * 报告完成了一步, 检查取消, 每完成一块就让出一次事件循环.
   * @returns 让出事件循环 (如果需要) 之后兑现; 用户已取消时拒绝, 原因是 `ExportCancelledError`.
   */
  readonly tick: () => Promise<void>;
}

/**
 * 创建分块节奏器.
 * @param context 序列化用到的外部能力.
 * @param chunkSize 每块的步数, 默认是 `EXPORT_CHUNK_SIZE`.
 * @returns 分块节奏器.
 */
export function createChunkPacer(
  context: ExportSerializeContext,
  chunkSize = EXPORT_CHUNK_SIZE,
): ChunkPacer {
  let completed = 0;
  return {
    tick: async () => {
      completed += 1;
      context.advanceProgress(1);
      if (context.isCancelled()) {
        throw new ExportCancelledError();
      }
      if (completed % chunkSize === 0) {
        await context.yieldToEventLoop();
      }
    },
  };
}
