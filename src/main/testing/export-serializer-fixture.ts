import type { Readable } from "node:stream";

import type { ExportSerializeContext } from "../export/serializers/export-serializer";

/**
 * 序列化测试里固定的导出开始时刻.
 */
export const SAMPLE_CREATED_AT = new Date("2026-10-05T08:00:00.000Z");

/**
 * 序列化器报告过的进度步数之和.
 */
export interface ProgressTotal {
  /**
   * 步数之和.
   */
  total: number;
}

/**
 * 序列化器让出事件循环的次数.
 */
export interface YieldCount {
  /**
   * 让出的次数.
   */
  count: number;
}

/**
 * 测试里的一次序列化环境: 假的外部能力与可观察的状态.
 */
export interface SerializeFixture {
  /**
   * 交给序列化器的外部能力.
   */
  readonly context: ExportSerializeContext;
  /**
   * 序列化器报告过的进度步数之和.
   */
  readonly progress: ProgressTotal;
  /**
   * 序列化器按顺序读取过的附件编号.
   */
  readonly readAttachmentIds: string[];
  /**
   * 序列化器让出事件循环的次数.
   */
  readonly yields: YieldCount;
  /**
   * 调用后序列化器会看到用户已取消.
   */
  readonly cancel: () => void;
}

/**
 * 创建序列化测试环境. 预设字段名取 `label:字段键`, 便于断言.
 * @param attachments 附件编号到内容的映射, 没有登记的附件读不到.
 * @returns 序列化测试环境.
 */
export function createSerializeFixture(
  attachments: ReadonlyMap<string, Buffer> = new Map(),
): SerializeFixture {
  const progress = { total: 0 };
  const yields = { count: 0 };
  const readAttachmentIds: string[] = [];
  let isCancelled = false;
  return {
    context: {
      createdAt: SAMPLE_CREATED_AT,
      readAttachment: (attachmentId) => {
        readAttachmentIds.push(attachmentId);
        return attachments.get(attachmentId);
      },
      labelOfField: (fieldKey) => `label:${fieldKey}`,
      advanceProgress: (steps) => {
        progress.total += steps;
      },
      yieldToEventLoop: async () => {
        yields.count += 1;
      },
      isCancelled: () => isCancelled,
    },
    progress,
    readAttachmentIds,
    yields,
    cancel: () => {
      isCancelled = true;
    },
  };
}

/**
 * 读完一个可读流的全部字节.
 * @param stream 可读流.
 * @returns 全部字节, 流出错时拒绝.
 */
export async function collectStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}
