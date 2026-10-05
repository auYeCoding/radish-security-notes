import { isEntryFieldKey } from "@shared/entries/preset-entry-types";
import type { ExportTranslateKey } from "@shared/export/export-message-keys";

import { findAttachmentContent } from "../attachments/attachment-content-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { ExportProgressTracker } from "./export-progress";
import type { ExportSerializeContext } from "./serializers/export-serializer";

/**
 * 创建序列化外部能力需要的依赖.
 */
export interface SerializeContextDependencies {
  /**
   * 导出开始的时刻.
   */
  readonly createdAt: Date;
  /**
   * 取已解锁数据库的查询入口, 未解锁时返回 undefined.
   */
  readonly getOrm: () => VaultOrm | undefined;
  /**
   * 取当前语言文案的函数.
   */
  readonly translate: (key: ExportTranslateKey) => string;
  /**
   * 进度记录器.
   */
  readonly tracker: ExportProgressTracker;
  /**
   * 进度的总步数.
   */
  readonly totalSteps: number;
  /**
   * 让出事件循环.
   */
  readonly yieldToEventLoop: () => Promise<void>;
  /**
   * 中止信号, 用户取消或导出失败后触发.
   */
  readonly signal: AbortSignal;
}

/**
 * 创建交给序列化器的外部能力: 附件内容按编号逐个从库里读, 预设字段名取当前语言文案, 进度写进
 * 记录器, 取消看中止信号.
 * @param dependencies 依赖.
 * @returns 序列化用到的外部能力.
 */
export function createSerializeContext(
  dependencies: SerializeContextDependencies,
): ExportSerializeContext {
  const { tracker, totalSteps } = dependencies;
  let processed = 0;
  return {
    createdAt: dependencies.createdAt,
    readAttachment: (attachmentId) => {
      const orm = dependencies.getOrm();
      return orm === undefined
        ? undefined
        : findAttachmentContent(orm, attachmentId);
    },
    labelOfField: (fieldKey) =>
      isEntryFieldKey(fieldKey)
        ? dependencies.translate(`entryFields.${fieldKey}`)
        : fieldKey,
    advanceProgress: (steps) => {
      processed += steps;
      tracker.advance(processed, totalSteps);
    },
    yieldToEventLoop: dependencies.yieldToEventLoop,
    isCancelled: () => dependencies.signal.aborted,
  };
}
