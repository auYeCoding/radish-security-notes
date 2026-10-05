import type { Readable } from "node:stream";

import type { ExportFormatKey } from "@shared/export/export-format-keys";
import type { ExportLossItem } from "@shared/export/export-loss-reasons";

import type { ExportDataset } from "../dataset/export-dataset";

/**
 * 序列化时用到的外部能力. 经接口注入, 序列化器不直接碰数据库, 界面语言与事件循环.
 */
export interface ExportSerializeContext {
  /**
   * 导出开始的时刻.
   */
  readonly createdAt: Date;
  /**
   * 按编号读取一个附件的全部字节, 写入这个附件时才调用.
   */
  readonly readAttachment: (attachmentId: string) => Buffer | undefined;
  /**
   * 取预设类型字段在当前界面语言下的名称.
   */
  readonly labelOfField: (fieldKey: string) => string;
  /**
   * 报告又完成了若干步, 一步是一个条目或一个附件.
   */
  readonly advanceProgress: (steps: number) => void;
  /**
   * 让出事件循环, 让进度轮询等请求有机会被处理.
   */
  readonly yieldToEventLoop: () => Promise<void>;
  /**
   * 判断用户是否已取消.
   */
  readonly isCancelled: () => boolean;
}

/**
 * 序列化器产出的内容: 未加密的字节流, 与写进文件的计数和带不出内容的汇总.
 */
export interface ExportPayload {
  /**
   * 未加密的文件字节流, 被读取时才开始处理数据.
   */
  readonly stream: Readable;
  /**
   * 写进文件的条目个数.
   */
  readonly entryCount: number;
  /**
   * 写进文件的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 这种格式实际带不出的内容的汇总, 个数为 0 的原因不列出.
   */
  readonly losses: readonly ExportLossItem[];
}

/**
 * 一种导出格式的序列化器: 把中立数据集转成文件字节流. 各格式的序列化器互相独立.
 */
export interface ExportSerializer {
  /**
   * 序列化器负责的格式.
   */
  readonly key: ExportFormatKey;
  /**
   * 计算序列化要报告的总步数, 用来显示进度.
   * @param dataset 数据集.
   * @returns 总步数.
   */
  readonly countSteps: (dataset: ExportDataset) => number;
  /**
   * 把数据集序列化成字节流. 返回时字节流还没有开始读取数据.
   * @param dataset 数据集.
   * @param context 序列化用到的外部能力.
   * @returns 字节流与计数, 带不出内容的汇总.
   */
  readonly serialize: (
    dataset: ExportDataset,
    context: ExportSerializeContext,
  ) => ExportPayload;
}
