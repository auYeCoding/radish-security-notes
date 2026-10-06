import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { readyRestoreWith } from "@renderer/testing/fake-restore-bridge";
import {
  openRestoreDialogWith,
  openRestorePreviewWith,
} from "@renderer/testing/open-restore-dialog";
import { isButtonDisabled } from "@renderer/testing/open-email-backup-dialog";

import { RestoreTrigger } from "./restore-trigger";

describe("恢复对话框: 选择文件", () => {
  it("打开后说明支持的文件, 会恢复的内容与不在备份里的内容, 选择之前不读取任何文件", async () => {
    const environment = await openRestoreDialogWith(() => <RestoreTrigger />);

    expect(screen.getByText("从备份恢复", { selector: "h2" })).toBeDefined();
    expect(screen.getByText("会恢复的内容")).toBeDefined();
    expect(
      screen.getByText("全部条目, 附件, 文件夹, 标签与自定义类型."),
    ).toBeDefined();
    expect(screen.getByText("不在备份里的内容")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
    expect(environment.restoreBridge.chooseFile).not.toHaveBeenCalled();
  });
});

describe("恢复对话框: 预览", () => {
  it("列出备份时间, 各类个数, 附件的个数与大小, 保密字段, 附件内容与加密状态", async () => {
    await openRestorePreviewWith(() => <RestoreTrigger />);

    const rows = screen
      .getAllByRole("definition")
      .map((row) => row.textContent);
    expect(rows).toEqual([
      "2026年10月5日 12:30",
      "8",
      "2",
      "3",
      "1",
      "3 个, 共 3 KB",
      "包含",
      "包含",
      "未加密",
    ]);
    expect(screen.getByText(/备份生成于 2026年10月5日 12:30\. /)).toBeDefined();
  });

  it("保险库是空的时说明按原样写入, 没有清空确认, 按钮是开始恢复且可点", async () => {
    await openRestorePreviewWith(() => <RestoreTrigger />);

    expect(
      screen.getByText("当前保险库是空的, 备份里的内容会按原样写入."),
    ).toBeDefined();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("将清空当前保险库")).toBeNull();
    expect(screen.queryByRole("button", { name: "清空并恢复" })).toBeNull();
    expect(isButtonDisabled("开始恢复")).toBe(false);
  });
});

describe("恢复对话框: 预览里的警示与返回", () => {
  it("备份含保密字段与附件内容时没有这两条警示", async () => {
    await openRestorePreviewWith(() => <RestoreTrigger />);

    expect(screen.queryByText("这个备份不含保密字段")).toBeNull();
    expect(screen.queryByText("这个备份不含附件内容")).toBeNull();
  });

  it("备份不含保密字段与附件内容时分别给出警示, 对应行写不包含", async () => {
    await openRestorePreviewWith(() => <RestoreTrigger />, {
      restoreBridgeOverrides: {
        chooseFile: readyRestoreWith({
          includesSecrets: false,
          includesAttachments: false,
        }),
      },
    });

    expect(screen.getByText("这个备份不含保密字段")).toBeDefined();
    expect(
      screen.getByText(
        "密码, 密钥, TOTP 密钥等保密字段在备份里是空的, 恢复后这些字段也是空的.",
      ),
    ).toBeDefined();
    expect(screen.getByText("这个备份不含附件内容")).toBeDefined();
    expect(screen.getByText("恢复后条目上没有附件.")).toBeDefined();
    const rows = screen
      .getAllByRole("definition")
      .map((row) => row.textContent);
    expect(rows.slice(6, 8)).toEqual(["不包含", "不包含"]);
  });

  it("点重新选择回到选择文件, 并让主进程放弃已读出的备份", async () => {
    const environment = await openRestorePreviewWith(() => <RestoreTrigger />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "重新选择" }));

    expect(
      await screen.findByRole("button", { name: "选择备份文件..." }),
    ).toBeDefined();
    expect(screen.queryByText("确认恢复内容")).toBeNull();
    expect(environment.restoreBridge.cancel).toHaveBeenCalledTimes(1);
  });
});
