import { describe, expect, it, vi } from "vitest";

import {
  REMOTE_DEBUGGING_REFUSED_EXIT_CODE,
  refuseRemoteDebugging,
  type RemoteDebuggingGuardApp,
} from "./refuse-remote-debugging";

/**
 * 假应用与记录退出调用的间谍.
 */
interface FakeApp {
  /**
   * 交给被测函数的假应用.
   */
  readonly app: RemoteDebuggingGuardApp;
  /**
   * 记录 `app.exit` 调用的间谍.
   */
  readonly exit: ReturnType<typeof vi.fn>;
}

/**
 * 按命令行参数创建假应用: 开关的识别比照 Chromium, 前缀可以是 `--`, `-`, `/`, 名称不区分大小写,
 * 等号后面是开关的值.
 * @param isPackaged 应用是否已打包.
 * @param argv 命令行参数.
 * @returns 假应用与记录退出调用的间谍.
 */
function createFakeApp(isPackaged: boolean, argv: readonly string[]): FakeApp {
  const exit = vi.fn();
  const switches = argv
    .filter((argument) => /^(--|-|\/)/.test(argument))
    .map((argument) =>
      argument
        .replace(/^(--|-|\/)/, "")
        .split("=")[0]
        .toLowerCase(),
    );
  return {
    app: {
      isPackaged,
      commandLine: { hasSwitch: (name) => switches.includes(name) },
      exit,
    },
    exit,
  };
}

describe("refuseRemoteDebugging 打包版", () => {
  it.each([
    ["调试端口带值", ["--remote-debugging-port=9222"]],
    ["调试端口不带值", ["--remote-debugging-port"]],
    ["调试管道", ["--remote-debugging-pipe"]],
    ["单横线前缀", ["-remote-debugging-port=9222"]],
    ["斜线前缀", ["/remote-debugging-port=9222"]],
    ["大小写不同", ["--Remote-Debugging-Port=9222"]],
    ["夹在其它参数之间", ["--lang=zh-CN", "--remote-debugging-pipe", "--x"]],
  ])("命令行带远程调试开关 (%s) 时退出并返回 true", (_name, argv) => {
    const { app, exit } = createFakeApp(true, argv);

    expect(refuseRemoteDebugging(app)).toBe(true);
    expect(exit).toHaveBeenCalledExactlyOnceWith(
      REMOTE_DEBUGGING_REFUSED_EXIT_CODE,
    );
  });

  it("命令行没有远程调试开关时不退出并返回 false", () => {
    const { app, exit } = createFakeApp(true, [
      "--lang=zh-CN",
      "--inspect-brk=9229",
      "remote-debugging-port",
    ]);

    expect(refuseRemoteDebugging(app)).toBe(false);
    expect(exit).not.toHaveBeenCalled();
  });
});

describe("refuseRemoteDebugging 开发版", () => {
  it("开发版带远程调试开关也不退出, 并且不读命令行", () => {
    const { app, exit } = createFakeApp(false, [
      "--remote-debugging-port=9222",
    ]);
    const hasSwitch = vi.spyOn(app.commandLine, "hasSwitch");

    expect(refuseRemoteDebugging(app)).toBe(false);
    expect(exit).not.toHaveBeenCalled();
    expect(hasSwitch).not.toHaveBeenCalled();
  });

  it("退出码是 1", () => {
    expect(REMOTE_DEBUGGING_REFUSED_EXIT_CODE).toBe(1);
  });
});
