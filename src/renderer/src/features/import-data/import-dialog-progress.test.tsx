import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { importSucceeded } from "@shared/import/import-result";
import type { ImportChooseOutcome } from "@shared/import/import-types";
import type { ImportResult } from "@shared/import/import-result";

import { renderInEntryEnvironment } from "@renderer/testing/render-in-entry-environment";

import { ImportTrigger } from "./import-trigger";

/**
 * 一个由测试决定何时兑现的选择文件结果.
 */
interface PendingChoice {
  /**
   * 兑现选择文件的结果.
   */
  readonly resolve: (value: ImportResult<ImportChooseOutcome>) => void;
  /**
   * 选择文件的承诺.
   */
  readonly promise: Promise<ImportResult<ImportChooseOutcome>>;
}

/**
 * 创建一个等测试来兑现的选择文件结果.
 * @returns 承诺与兑现函数.
 */
function createPendingChoice(): PendingChoice {
  let resolve: PendingChoice["resolve"] = () => undefined;
  const promise = new Promise<ImportResult<ImportChooseOutcome>>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

describe("导入对话框: 处理中的进度", () => {
  it("轮询主进程的进度, 显示阶段与已处理个数, 处理中不能直接关闭", async () => {
    const pending = createPendingChoice();
    await renderInEntryEnvironment(() => <ImportTrigger />, {
      importBridgeOverrides: {
        chooseFile: () => pending.promise,
        getProgress: vi.fn(() =>
          Promise.resolve({
            stage: "parsing" as const,
            processed: 50,
            total: 200,
          }),
        ),
      },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "导入数据" }));
    await user.click(
      await screen.findByRole("button", { name: "选择文件..." }),
    );

    expect(await screen.findByText("正在解析...")).toBeDefined();
    expect(await screen.findByText("50 / 200")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "25",
    );
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    pending.resolve(importSucceeded({ status: "cancelled" as const }));
  });

  it("点取消让主进程取消, 主进程返回取消后回到选择来源", async () => {
    const pending = createPendingChoice();
    const { environment } = await renderInEntryEnvironment(
      () => <ImportTrigger />,
      { importBridgeOverrides: { chooseFile: () => pending.promise } },
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "导入数据" }));
    await user.click(
      await screen.findByRole("button", { name: "选择文件..." }),
    );

    await user.click(await screen.findByRole("button", { name: "取消" }));
    pending.resolve(importSucceeded({ status: "cancelled" as const }));

    expect(environment.importBridge.cancel).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("选择来源与文件格式")).toBeDefined();
  });
});
