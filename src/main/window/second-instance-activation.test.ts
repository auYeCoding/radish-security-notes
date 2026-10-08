import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createMainWindowHolder } from "./main-window-holder";
import {
  watchSecondInstance,
  type ActivatableWindow,
} from "./second-instance-activation";

/**
 * 假窗口的状态.
 */
interface FakeWindowState {
  /**
   * 窗口是否已经销毁.
   */
  readonly isDestroyed?: boolean;
  /**
   * 窗口是否最小化.
   */
  readonly isMinimized?: boolean;
}

/**
 * 假窗口, 记下被调用的方法名与顺序.
 */
interface FakeWindow extends ActivatableWindow {
  /**
   * 按调用顺序记下的会改变窗口的方法名.
   */
  readonly calls: string[];
}

/**
 * 创建假窗口.
 * @param state 窗口的状态.
 * @returns 假窗口.
 */
function createFakeWindow(state: FakeWindowState = {}): FakeWindow {
  const calls: string[] = [];
  return {
    calls,
    isDestroyed: () => state.isDestroyed ?? false,
    isMinimized: () => state.isMinimized ?? false,
    restore: () => {
      calls.push("restore");
    },
    focus: () => {
      calls.push("focus");
    },
  };
}

/**
 * 假的应用对象, 登记监听函数, 可以模拟第二个实例启动.
 */
interface FakeApp {
  /**
   * 交给被测函数的 `on` 方法.
   */
  readonly on: (event: "second-instance", listener: () => void) => unknown;
  /**
   * 模拟第二个实例启动.
   */
  readonly emitSecondInstance: () => void;
  /**
   * 已登记的事件名.
   */
  readonly registeredEvents: () => string[];
}

/**
 * 创建假的应用对象.
 * @returns 假应用.
 */
function createFakeApp(): FakeApp {
  const listeners: (() => void)[] = [];
  const events: string[] = [];
  return {
    on: (event, listener) => {
      events.push(event);
      listeners.push(listener);
    },
    emitSecondInstance: () => listeners.forEach((listener) => listener()),
    registeredEvents: () => events,
  };
}

/**
 * 登记窗口并监听第二个实例, 再模拟一次第二个实例启动.
 * @param window 要登记的窗口, 不给时不登记任何窗口.
 * @returns 假应用, 方便再次模拟.
 */
function startWatching(window?: FakeWindow): FakeApp {
  const app = createFakeApp();
  const holder = createMainWindowHolder<ActivatableWindow>();
  if (window !== undefined) {
    holder.set(window);
  }
  watchSecondInstance(app, holder);
  return app;
}

describe("watchSecondInstance", () => {
  it("只监听 second-instance 一个事件", () => {
    expect(startWatching(createFakeWindow()).registeredEvents()).toEqual([
      "second-instance",
    ]);
  });

  it("最小化的窗口先还原再聚焦", () => {
    const window = createFakeWindow({ isMinimized: true });

    startWatching(window).emitSecondInstance();

    expect(window.calls).toEqual(["restore", "focus"]);
  });

  it("没有最小化的窗口只聚焦, 不还原", () => {
    const window = createFakeWindow({ isMinimized: false });

    startWatching(window).emitSecondInstance();

    expect(window.calls).toEqual(["focus"]);
  });

  it("每次第二个实例启动都唤起一次", () => {
    const window = createFakeWindow();
    const app = startWatching(window);

    app.emitSecondInstance();
    app.emitSecondInstance();

    expect(window.calls).toEqual(["focus", "focus"]);
  });
});

describe("watchSecondInstance 没有可唤起的窗口", () => {
  it("主窗口还没有登记时什么都不做, 不报错", () => {
    const app = startWatching();

    expect(() => app.emitSecondInstance()).not.toThrow();
  });

  it("主窗口已经销毁时不还原也不聚焦", () => {
    const window = createFakeWindow({ isDestroyed: true, isMinimized: true });

    startWatching(window).emitSecondInstance();

    expect(window.calls).toEqual([]);
  });

  it("读取窗口持有者只在事件到来时发生, 登记之后换成的新窗口也能唤起", () => {
    const first = createFakeWindow();
    const second = createFakeWindow({ isMinimized: true });
    const app = createFakeApp();
    const holder = createMainWindowHolder<ActivatableWindow>();
    holder.set(first);
    watchSecondInstance(app, holder);
    holder.set(second);

    app.emitSecondInstance();

    expect(first.calls).toEqual([]);
    expect(second.calls).toEqual(["restore", "focus"]);
  });
});

describe("watchSecondInstance 与保险库无关", () => {
  it("模块的导入只有主窗口持有者, 不引入保险库, 不改变解锁状态", () => {
    const source = readFileSync(
      resolve(__dirname, "second-instance-activation.ts"),
      "utf8",
    );
    const specifiers = Array.from(
      source.matchAll(/from "([^"]+)"/g),
      (match) => match[1],
    );

    expect(specifiers).toEqual(["./main-window-holder"]);
  });
});
