import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { WindowControlsBridge } from "@shared/window/window-controls-bridge";

import {
  createFakeWindowControlsBridge,
  type FakeWindowControlsBridge,
} from "@renderer/testing/fake-window-controls-bridge";

import { useWindowMaximized } from "./use-window-maximized";
import { WindowControlsBridgeProvider } from "./window-controls-bridge-provider";

/**
 * hook 返回值的引用, 每次读取 `current` 得到最新值.
 */
interface MaximizedResult {
  /**
   * hook 的当前返回值.
   */
  readonly current: boolean;
}

/**
 * 渲染出的 hook 与它所在的假桥.
 */
interface RenderedMaximized {
  /**
   * 注入的假窗口控制桥.
   */
  readonly bridge: FakeWindowControlsBridge;
  /**
   * hook 返回值的引用.
   */
  readonly result: MaximizedResult;
  /**
   * 卸载 hook 所在的组件.
   */
  readonly unmount: () => void;
}

/**
 * 包裹 hook 的组件的属性.
 */
interface BridgeWrapperProps {
  /**
   * 被包裹的内容.
   */
  readonly children: ReactNode;
}

/**
 * 在假窗口控制桥里渲染 hook.
 * @param overrides 覆盖假桥上的方法.
 * @returns 假桥与 hook 的渲染结果.
 */
function renderMaximized(
  overrides: Partial<WindowControlsBridge> = {},
): RenderedMaximized {
  const bridge = createFakeWindowControlsBridge(overrides);
  const wrapper = (props: BridgeWrapperProps): React.JSX.Element => (
    <WindowControlsBridgeProvider bridge={bridge}>
      {props.children}
    </WindowControlsBridgeProvider>
  );
  const { result, unmount } = renderHook(() => useWindowMaximized(), {
    wrapper,
  });
  return { bridge, result, unmount };
}

describe("useWindowMaximized", () => {
  it("一开始是未最大化, 读到初始状态后跟随它", async () => {
    const { result } = renderMaximized({
      isMaximized: () => Promise.resolve(true),
    });

    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("主进程推送变化时随之更新", async () => {
    const { bridge, result } = renderMaximized();
    await waitFor(() => expect(bridge.isMaximized).toHaveBeenCalled());

    act(() => bridge.emitMaximizedChange(true));
    expect(result.current).toBe(true);
    act(() => bridge.emitMaximizedChange(false));

    expect(result.current).toBe(false);
  });

  it("读取初始状态期间收到的推送不会被稍后到达的初始状态覆盖", async () => {
    let resolveInitial: (isMaximized: boolean) => void = () => undefined;
    const { bridge, result } = renderMaximized({
      isMaximized: () =>
        new Promise<boolean>((resolve) => {
          resolveInitial = resolve;
        }),
    });

    act(() => bridge.emitMaximizedChange(true));
    await act(async () => resolveInitial(false));

    expect(result.current).toBe(true);
  });

  it("卸载时取消订阅", async () => {
    const { bridge, unmount } = renderMaximized();
    await waitFor(() => expect(bridge.getListenerCount()).toBe(1));

    unmount();

    expect(bridge.getListenerCount()).toBe(0);
  });
});
