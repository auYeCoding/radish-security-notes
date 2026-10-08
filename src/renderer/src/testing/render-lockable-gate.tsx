import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "./entry-test-environment";

/**
 * 渲染可以锁定的整个保险库门控并等条目读取完成: 保险库默认已解锁且设了主密码, 渲染之前先接上
 * 锁定时重置工作区的订阅. 门控元素与订阅函数由调用方给出, 因为测试支撑代码不能引用组件与 feature.
 * @param createGate 生成门控元素的函数.
 * @param watchLock 接上锁定时重置工作区的订阅的函数.
 * @param options 条目环境的选项, 例如初始条目, 是否设了主密码, 覆盖假桥的方法.
 * @returns 渲染所用的环境.
 */
export async function renderLockableGate(
  createGate: () => React.ReactElement,
  watchLock: (environment: EntryTestEnvironment) => void,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    hasMasterPassword: true,
    ...options,
  });
  watchLock(environment);
  render(createGate(), { wrapper: environment.Providers });
  await waitFor(() =>
    expect(environment.entryStore.getState().loadStatus).toBe("ready"),
  );
  return environment;
}
