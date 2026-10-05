import {
  createChunkObserver,
  createProgressTracker,
  type ChunkObserver,
} from "../import/import-progress";
import type {
  ImportedEntryDraft,
  ImportSourceAdapter,
  SourceParseOutput,
  SourceParseResult,
} from "../import/source-adapter";

/**
 * 建一个登录类型的草稿, 没给的部分取空值.
 * @param overrides 要覆盖的部分.
 * @returns 草稿.
 */
export function draftOf(
  overrides: Partial<ImportedEntryDraft> = {},
): ImportedEntryDraft {
  return {
    name: "示例网站",
    typeKey: "login",
    fields: { account: "alice", password: "p@ss", url: "https://example.com" },
    notes: "",
    customFields: [],
    totp: "",
    folderPath: "",
    tagNames: [],
    losses: [],
    ...overrides,
  };
}

/**
 * 建一个不让出事件循环, 不会取消的分块观察者, 测试里用来驱动适配器与规划器.
 * @returns 分块观察者.
 */
export function createTestObserver(): ChunkObserver {
  return createChunkObserver({
    tracker: createProgressTracker(),
    yieldToEventLoop: async () => undefined,
    isCancelled: () => false,
  });
}

/**
 * 用适配器解析一段文本.
 * @param adapter 来源适配器.
 * @param text 来源文件的文本.
 * @returns 解析结果.
 */
export function parseSample(
  adapter: ImportSourceAdapter,
  text: string,
): Promise<SourceParseResult> {
  return adapter.parse(text, createTestObserver());
}

/**
 * 用适配器解析一段文本并取出输出, 解析失败时抛错.
 * @param adapter 来源适配器.
 * @param text 来源文件的文本.
 * @returns 草稿与带不进的行.
 */
export async function parseOutput(
  adapter: ImportSourceAdapter,
  text: string,
): Promise<SourceParseOutput> {
  const result = await parseSample(adapter, text);
  if (!result.ok) {
    throw new Error(`解析失败: ${result.reason}`);
  }
  return result.value;
}
