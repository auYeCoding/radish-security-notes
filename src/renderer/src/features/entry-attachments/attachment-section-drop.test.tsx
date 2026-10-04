import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { failingAttachmentWith } from "@renderer/testing/fake-attachment-bridge";

import { AttachmentSection } from "./attachment-section";

/**
 * 渲染出来的附件区与它所用的环境.
 */
interface RenderedSection {
  /**
   * 渲染所用的环境.
   */
  readonly environment: EntryTestEnvironment;
  /**
   * 附件区元素, 也是拖放区.
   */
  readonly zone: HTMLElement;
}

/**
 * 一次拖放事件的初始化数据.
 */
interface DragInit {
  /**
   * 拖动数据.
   */
  readonly dataTransfer: {
    /**
     * 拖动内容里的类型名.
     */
    readonly types: string[];
    /**
     * 拖动里的文件.
     */
    readonly files: File[];
    /**
     * 放下时的效果, 悬停处理会把它改成 copy.
     */
    dropEffect: string;
  };
}

/**
 * 渲染钱包条目的附件区, 等附件列表读完.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境与附件区元素.
 */
async function renderSection(
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedSection> {
  const environment = await createEntryTestEnvironment(options);
  render(<AttachmentSection entryId={WALLET_ENTRY.id} />, {
    wrapper: environment.Providers,
  });
  await screen.findByText(/还没有附件/);
  return { environment, zone: screen.getByRole("region", { name: "附件" }) };
}

/**
 * 造一个带文件的拖动数据.
 * @param files 拖入的文件.
 * @returns 拖动数据.
 */
function carrying(files: File[]): DragInit {
  return { dataTransfer: { types: ["Files"], files, dropEffect: "none" } };
}

describe("拖入文件", () => {
  it("拖着文件悬在区域上时显示提示, 离开后消失", async () => {
    const { zone } = await renderSection();

    fireEvent.dragEnter(zone, carrying([]));
    expect(screen.getByRole("status").textContent).toContain("松开鼠标");
    fireEvent.dragLeave(zone, carrying([]));

    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("放下文件后把文件交给桥, 新附件出现在列表里, 提示消失", async () => {
    const { environment, zone } = await renderSection();
    const file = new File(["abc"], "证书.pem");

    fireEvent.dragEnter(zone, carrying([file]));
    fireEvent.drop(zone, carrying([file]));

    expect(await screen.findByText("证书.pem")).toBeDefined();
    expect(environment.attachmentBridge.addDropped).toHaveBeenCalledWith(
      WALLET_ENTRY.id,
      [file],
    );
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("悬停时声明可复制, 放下的默认行为被阻止", async () => {
    const { zone } = await renderSection();
    const over = carrying([]);

    const notPrevented = fireEvent.dragOver(zone, over);
    const dropNotPrevented = fireEvent.drop(zone, carrying([]));

    expect(notPrevented).toBe(false);
    expect(dropNotPrevented).toBe(false);
    expect(over.dataTransfer.dropEffect).toBe("copy");
  });
});

describe("拖入的失败与忽略", () => {
  it("拖入不合规的文件时提示原因", async () => {
    const { zone } = await renderSection({
      attachmentBridgeOverrides: {
        addDropped: failingAttachmentWith("not-a-file", "文件夹"),
      },
    });

    fireEvent.drop(zone, carrying([new File([], "文件夹")]));

    expect((await screen.findByRole("alert")).textContent).toContain(
      '"文件夹" 不是文件',
    );
  });

  it("拖动里没有文件 (例如拖文字) 时不处理", async () => {
    const { environment, zone } = await renderSection();

    const notPrevented = fireEvent.drop(zone, {
      dataTransfer: { types: ["text/plain"], files: [] },
    });

    expect(notPrevented).toBe(true);
    expect(environment.attachmentBridge.addDropped).not.toHaveBeenCalled();
  });
});
