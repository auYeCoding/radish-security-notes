import { render } from "@testing-library/react";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "./entry-test-environment";

/**
 * 在条目环境里渲染一个元素后拿到的结果.
 */
export interface RenderedInEnvironment {
  /**
   * 渲染结果所在的容器元素.
   */
  readonly container: HTMLElement;
  /**
   * 渲染所用的条目环境, 其中的假桥记录了对桥的调用.
   */
  readonly environment: EntryTestEnvironment;
}

/**
 * 在条目环境里渲染一个由环境生成的元素. 要渲染的元素由调用方生成, 因为测试支撑代码不能引用
 * 组件与 feature.
 * @param createElement 由条目环境生成要渲染的元素的函数.
 * @param options 条目环境的选项, 例如覆盖假链接桥的方法.
 * @returns 渲染结果的容器与渲染所用的环境.
 */
export async function renderInEntryEnvironment(
  createElement: (environment: EntryTestEnvironment) => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedInEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  const { container } = render(createElement(environment), {
    wrapper: environment.Providers,
  });
  return { container, environment };
}
