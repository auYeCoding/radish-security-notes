import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { RestoreProblem } from "@shared/restore/restore-problem";
import {
  restoreSucceeded,
  type RestoreFailureReason,
} from "@shared/restore/restore-result";

import {
  failingRestoreWith,
  needsPassphraseWith,
} from "@renderer/testing/fake-restore-bridge";
import {
  chooseBackupFile,
  openRestoreDialogWith,
  openRestorePreviewWith,
} from "@renderer/testing/open-restore-dialog";

import { RestoreTrigger } from "./restore-trigger";

/**
 * 选择文件时的一种失败与它应显示的文案.
 */
interface FailureCase {
  /**
   * 失败原因.
   */
  readonly reason: RestoreFailureReason;
  /**
   * 第一个问题, 与具体问题无关时没有这一项.
   */
  readonly problem?: RestoreProblem;
  /**
   * 应显示的文案.
   */
  readonly text: string;
}

/**
 * 选择文件时会遇到的失败.
 */
const CHOOSE_FAILURES: readonly FailureCase[] = [
  { reason: "not-a-backup", text: "不是本应用的备份文件." },
  {
    reason: "newer-version",
    text: "备份来自更新版本的应用, 请先升级本应用再恢复.",
  },
  {
    reason: "invalid-content",
    problem: { section: "entries", code: "duplicate-id", position: 3 },
    text: "备份内容不合规, 已整体拒绝, 没有改动任何数据. 第一个问题: 条目, 第 3 项, 编号重复.",
  },
  {
    reason: "limit-exceeded",
    problem: { section: "archive", code: "too-many-files" },
    text: "备份超过恢复上限, 已整体拒绝, 没有改动任何数据. 第一个问题: 压缩包, 文件个数过多.",
  },
  {
    reason: "damaged-file",
    text: "备份文件已损坏或不完整, 没有改动任何数据.",
  },
  { reason: "file-too-large", text: "这个文件超过恢复上限, 无法恢复." },
];

describe("恢复对话框: 选择文件失败", () => {
  it.each(CHOOSE_FAILURES)(
    "$reason 时显示对应文案, 点重新选择回到选择文件",
    async ({ reason, problem, text }) => {
      const environment = await openRestoreDialogWith(
        () => <RestoreTrigger />,
        {
          restoreBridgeOverrides: {
            chooseFile: failingRestoreWith(reason, problem),
          },
        },
      );
      await chooseBackupFile();

      expect(await screen.findByText(text)).toBeDefined();
      expect(
        screen.queryByRole("button", { name: "选择备份文件..." }),
      ).toBeNull();

      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "重新选择" }));

      expect(
        await screen.findByRole("button", { name: "选择备份文件..." }),
      ).toBeDefined();
      expect(screen.queryByText(text)).toBeNull();
      expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
    },
  );

  it("用户取消系统对话框时停在选择文件, 没有失败提示", async () => {
    await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        chooseFile: () =>
          Promise.resolve(restoreSucceeded({ status: "cancelled" as const })),
      },
    });
    await chooseBackupFile();

    expect(
      await screen.findByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toContain("不在备份里的内容");
  });
});

describe("恢复对话框: 解密与恢复失败", () => {
  it("口令不对以外的解密失败进入失败步骤, 点重新选择回到选择文件", async () => {
    await openRestoreDialogWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        chooseFile: needsPassphraseWith(2048),
        submitPassphrase: failingRestoreWith("damaged-file"),
      },
    });
    await chooseBackupFile();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("备份口令"), "passphrase");
    await user.click(screen.getByRole("button", { name: "解密并预览" }));

    expect(
      await screen.findByText("备份文件已损坏或不完整, 没有改动任何数据."),
    ).toBeDefined();
    await user.click(screen.getByRole("button", { name: "重新选择" }));
    expect(
      await screen.findByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
  });

  it("写库失败进入失败步骤, 提示没有任何改动, 不刷新界面数据", async () => {
    const environment = await openRestorePreviewWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: { run: failingRestoreWith("unexpected-error") },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始恢复" }));

    expect(
      await screen.findByText(
        "恢复失败, 没有任何改动. 请重试, 仍失败请关闭应用后重试.",
      ),
    ).toBeDefined();
    expect(environment.entryBridge.list).not.toHaveBeenCalled();
    expect(environment.entryTypeBridge.list).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "重新选择" }));
    expect(
      await screen.findByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
  });
});
