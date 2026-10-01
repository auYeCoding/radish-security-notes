import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  createLocalStatePersistence,
  type SystemKeyPersistence,
} from "./system-key-persistence";

/**
 * 测试用的最长等待时间, 单位毫秒.
 */
const TEST_TIMEOUT_MILLISECONDS = 300;

/**
 * 测试用的检查间隔, 单位毫秒.
 */
const TEST_POLL_INTERVAL_MILLISECONDS = 10;

/**
 * 一份已经含有系统密钥的 `Local State` 内容.
 */
const STATE_WITH_KEY = JSON.stringify({
  os_crypt: { encrypted_key: "RFBBUEk=" },
});

/**
 * 为指定目录下的 `Local State` 创建落盘等待器.
 * @param directory 用户数据目录.
 * @param timeoutMilliseconds 最长等待时间.
 * @returns 落盘等待器.
 */
function createPersistence(
  directory: string,
  timeoutMilliseconds = TEST_TIMEOUT_MILLISECONDS,
): SystemKeyPersistence {
  return createLocalStatePersistence({
    localStateFile: join(directory, "Local State"),
    timeoutMilliseconds,
    pollIntervalMilliseconds: TEST_POLL_INTERVAL_MILLISECONDS,
  });
}

describe("createLocalStatePersistence 已落盘", () => {
  const getDirectory = useTemporaryDirectory("system-key-persistence");

  it("Local State 已有系统密钥时立即返回 true", async () => {
    await writeFile(join(getDirectory(), "Local State"), STATE_WITH_KEY);

    expect(await createPersistence(getDirectory()).waitUntilPersisted()).toBe(
      true,
    );
  });

  it("等待期间系统密钥才写入时返回 true", async () => {
    const persistence = createPersistence(getDirectory(), 2000);
    const writing = delay(80).then(() =>
      writeFile(join(getDirectory(), "Local State"), STATE_WITH_KEY),
    );

    expect(await persistence.waitUntilPersisted()).toBe(true);
    await writing;
  });

  it("文件先是写了一半的内容, 之后补全时返回 true", async () => {
    const file = join(getDirectory(), "Local State");
    await writeFile(file, '{"os_crypt": {');
    const persistence = createPersistence(getDirectory(), 2000);
    const completing = delay(80).then(() => writeFile(file, STATE_WITH_KEY));

    expect(await persistence.waitUntilPersisted()).toBe(true);
    await completing;
  });
});

describe("createLocalStatePersistence 未落盘", () => {
  const getDirectory = useTemporaryDirectory("system-key-persistence");

  it("文件一直不存在时超时返回 false", async () => {
    expect(await createPersistence(getDirectory()).waitUntilPersisted()).toBe(
      false,
    );
  });

  it("文件里没有 os_crypt 时超时返回 false", async () => {
    await writeFile(
      join(getDirectory(), "Local State"),
      JSON.stringify({ browser: {} }),
    );

    expect(await createPersistence(getDirectory()).waitUntilPersisted()).toBe(
      false,
    );
  });

  it("系统密钥是空字符串时超时返回 false", async () => {
    await writeFile(
      join(getDirectory(), "Local State"),
      JSON.stringify({ os_crypt: { encrypted_key: "" } }),
    );

    expect(await createPersistence(getDirectory()).waitUntilPersisted()).toBe(
      false,
    );
  });
});
