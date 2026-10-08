import { describe, expect, it } from "vitest";

import config, { TEST_TIMEOUT_MILLISECONDS } from "../../../vitest.config";

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

  it("main 与 renderer 两个项目都设置了这个具名超时", () => {
    expect(
      readProjectOptions().map(({ name, testTimeout }) => [name, testTimeout]),
    ).toEqual([
      ["main", TEST_TIMEOUT_MILLISECONDS],
      ["renderer", TEST_TIMEOUT_MILLISECONDS],
    ]);
  });
});
