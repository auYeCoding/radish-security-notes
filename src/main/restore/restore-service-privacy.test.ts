import { basename } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_TOTP_SECRET,
} from "../testing/export-sample-data";
import type { RestoreResult } from "@shared/restore/restore-result";

import {
  createRestoreFixture,
  prepareChosenBackup,
  SAMPLE_BACKUP_PASSPHRASE,
  SAMPLE_RESTORE_MASTER_PASSWORD,
  useRestoreDatabases,
  writeBackupBytes,
  type RestoreDatabases,
  type RestoreFixture,
} from "../testing/restore-fixture";

/**
 * 备份里的内容, 都不应出现在返回给渲染端的任何结果里.
 */
const CONTENT_SAMPLES = [
  "示例登录",
  "alice@example.com",
  SAMPLE_LOGIN_PASSWORD,
  "forum-secret",
  SAMPLE_TOTP_SECRET,
  "报告 final.pdf",
  "router-secret",
  "招商银行卡",
] as const;

/**
 * 预览里约定的全部键.
 */
const PREVIEW_KEYS = [
  "attachmentBytes",
  "attachmentCount",
  "createdAt",
  "customTypeCount",
  "entryCount",
  "folderCount",
  "includesAttachments",
  "includesSecrets",
  "isEncrypted",
  "requiresMasterPassword",
  "tagCount",
  "vault",
];

/**
 * 一个不是正确口令的口令.
 */
const WRONG_PASSPHRASE = "wrong passphrase!!";

/**
 * 监听控制台的全部输出方法, 不让它们真的输出.
 * @returns 各方法的间谍.
 */
function spyOnConsole(): ReturnType<typeof vi.spyOn>[] {
  return (["log", "info", "warn", "error"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
}

/**
 * 走完一遍加密备份的恢复流程的产出.
 */
interface SecretFlow {
  /**
   * 恢复服务的测试环境.
   */
  readonly fixture: RestoreFixture;
  /**
   * 各步骤返回给渲染端的结果.
   */
  readonly results: RestoreResult<unknown>[];
  /**
   * 流程里出现过的路径, 文件名, 口令与主密码, 都不应出现在结果里.
   */
  readonly secrets: string[];
}

/**
 * 走一遍加密备份的恢复流程: 选择, 错口令, 对口令, 缺主密码, 对主密码.
 * @param databases 来源库, 目标库与目录.
 * @returns 流程的产出.
 */
async function runSecretFlow(databases: RestoreDatabases): Promise<SecretFlow> {
  const fixture = createRestoreFixture(() => databases.getTarget().orm);
  fixture.state.hasMasterPassword = true;
  const options = { passphrase: SAMPLE_BACKUP_PASSPHRASE };
  const path = await prepareChosenBackup(fixture, databases, options);
  const master = SAMPLE_RESTORE_MASTER_PASSWORD;
  const results = [
    await fixture.service.chooseFile(),
    await fixture.service.submitPassphrase(WRONG_PASSPHRASE),
    await fixture.service.submitPassphrase(SAMPLE_BACKUP_PASSPHRASE),
    await fixture.service.run({ acknowledgesReplace: false }),
    await fixture.service.run({
      acknowledgesReplace: false,
      masterPassword: master,
    }),
  ];
  const secrets = [
    path,
    databases.getDirectory(),
    basename(path),
    WRONG_PASSPHRASE,
  ];
  secrets.push(SAMPLE_BACKUP_PASSPHRASE, master);
  return { fixture, results, secrets };
}

describe("恢复服务: 口令, 路径与内容不进渲染端与日志", () => {
  const databases = useRestoreDatabases("restore-privacy");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("各步骤返回的结果里没有路径, 文件名, 口令, 主密码与任何条目, 附件内容", async () => {
    const spies = spyOnConsole();

    const { fixture, results, secrets } = await runSecretFlow(databases);

    const serialized = JSON.stringify(results);
    expect(results.map((result) => result.ok)).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
    for (const secret of [...secrets, ...CONTENT_SAMPLES]) {
      expect(serialized).not.toContain(secret);
    }
    expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(fixture.failures).toEqual([]);
  });
});

describe("恢复服务: 预览的内容", () => {
  const databases = useRestoreDatabases("restore-privacy-preview");

  it("预览只含约定的计数与标志", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);

    const result = await fixture.service.chooseFile();

    const preview =
      result.ok && "preview" in result.value ? result.value.preview : {};
    expect(Object.keys(preview).sort()).toEqual(PREVIEW_KEYS);
  });
});

describe("恢复服务: 预期内的失败不写日志", () => {
  const databases = useRestoreDatabases("restore-privacy-failure");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("不惊动失败回调, 失败结果也不带文件名与路径", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    const bytes = Buffer.from("not a backup at all");
    const directory = databases.getDirectory();
    fixture.state.chosenPath = await writeBackupBytes(
      directory,
      "my-private-notes.zip",
      bytes,
    );

    const result = await fixture.service.chooseFile();

    expect(result).toEqual({ ok: false, reason: "not-a-backup" });
    expect(JSON.stringify(result)).not.toContain("my-private-notes");
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.failures).toEqual([]);
  });
});
