import { vi } from "vitest";

import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";

/**
 * 创建组件测试用的假主密码开关桥: 每个方法都是间谍, 开启与关闭成功时翻转它记住的模式, 读取
 * 返回当前模式, 这样切换之后重新读取能看到新模式.
 * @param hasMasterPassword 初始是否设了主密码, 默认没有.
 * @param overrides 覆盖假桥上的方法, 例如让开启失败.
 * @returns 假主密码开关桥.
 */
export function createFakeMasterPasswordBridge(
  hasMasterPassword = false,
  overrides: Partial<MasterPasswordBridge> = {},
): MasterPasswordBridge {
  let currentHasMasterPassword = hasMasterPassword;
  return {
    hasMasterPassword: vi.fn(() => Promise.resolve(currentHasMasterPassword)),
    enable: vi.fn(() => {
      currentHasMasterPassword = true;
      return Promise.resolve({ ok: true as const });
    }),
    disable: vi.fn(() => {
      currentHasMasterPassword = false;
      return Promise.resolve({ ok: true as const });
    }),
    ...overrides,
  };
}
