import { vi } from "vitest";

import type { LinkBridge } from "@shared/links/link-bridge";

/**
 * 创建假链接桥: 打开外部链接的方法是间谍, 默认兑现 true, 表示已交给系统.
 * @param overrides 覆盖的方法, 例如让打开失败.
 * @returns 假链接桥.
 */
export function createFakeLinkBridge(
  overrides: Partial<LinkBridge> = {},
): LinkBridge {
  return {
    openExternal: vi.fn(() => Promise.resolve(true)),
    ...overrides,
  };
}
