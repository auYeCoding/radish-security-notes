import { describe, expect, it } from "vitest";

import config, {
  CONTINUOUS_INTEGRATION_TEST_TIMEOUT_MILLISECONDS,
  EFFECTIVE_TEST_TIMEOUT_MILLISECONDS,
  TEST_TIMEOUT_MILLISECONDS,
} from "../../../vitest.config";

/**
 * 配置里一个测试项目与本测试有关的选项.
 */
interface ProjectTestOptions {
  /**
   * 项目名称.
   */
  readonly name: string;
  /**
   * 单个测试的超时, 单位毫秒, 没设置时为 undefined.
   */
  readonly testTimeout?: number;
}

/**
 * 读出配置里每个项目的测试选项.
 * @returns 每个项目的名称与测试超时.
 */
function readProjectOptions(): ProjectTestOptions[] {
  const projects: unknown[] = config.test?.projects ?? [];
  return projects.flatMap((project) =>
    typeof project === "object" && project !== null && "test" in project
      ? [project.test as ProjectTestOptions]
      : [],
  );
}

describe("vitest.config.ts 的测试超时", () => {
  it("超时是默认 5 秒的三倍, 取具名常量", () => {
    expect(TEST_TIMEOUT_MILLISECONDS).toBe(15000);
  });

  it("持续集成环境的超时是本机超时的八倍", () => {
    expect(CONTINUOUS_INTEGRATION_TEST_TIMEOUT_MILLISECONDS).toBe(120000);
  });

  it("生效的超时只取本机与持续集成两个具名值之一", () => {
    expect([
      TEST_TIMEOUT_MILLISECONDS,
      CONTINUOUS_INTEGRATION_TEST_TIMEOUT_MILLISECONDS,
    ]).toContain(EFFECTIVE_TEST_TIMEOUT_MILLISECONDS);
  });

  it("main 与 renderer 两个项目都设置了生效的超时", () => {
    expect(
      readProjectOptions().map(({ name, testTimeout }) => [name, testTimeout]),
    ).toEqual([
      ["main", EFFECTIVE_TEST_TIMEOUT_MILLISECONDS],
      ["renderer", EFFECTIVE_TEST_TIMEOUT_MILLISECONDS],
    ]);
  });
});
