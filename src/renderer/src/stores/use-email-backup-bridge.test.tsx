import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createFakeEmailBackupBridge } from "@renderer/testing/fake-email-backup-bridge";

import { EmailBackupBridgeProvider } from "./email-backup-bridge-provider";
import { useEmailBackupBridge } from "./use-email-backup-bridge";

describe("useEmailBackupBridge", () => {
  it("在 Provider 内取到注入的桥", () => {
    const bridge = createFakeEmailBackupBridge();
    const { result } = renderHook(() => useEmailBackupBridge(), {
      wrapper: (props) => (
        <EmailBackupBridgeProvider bridge={bridge}>
          {props.children}
        </EmailBackupBridgeProvider>
      ),
    });
    expect(result.current).toBe(bridge);
  });

  it("不在 Provider 内时抛出明确的错误", () => {
    expect(() => renderHook(() => useEmailBackupBridge())).toThrow(
      "useEmailBackupBridge 必须在 EmailBackupBridgeProvider 内使用",
    );
  });
});
