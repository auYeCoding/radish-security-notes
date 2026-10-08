import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import {
  FADE_IN_MOTION,
  FAST_STATE_TRANSITION,
} from "@renderer/components/ui/state-motion";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { AttachmentDropZone } from "./attachment-drop-zone";
import { AttachmentRow } from "./attachment-row";

/**
 * 不关心回调的占位函数.
 */
const NO_OP = vi.fn();

/**
 * 测试用的附件.
 */
const ATTACHMENT: AttachmentMeta = { id: "a1", name: "note.txt", size: 2048 };

/**
 * 带文件的拖动数据, 悬停处理会把放下效果改成复制.
 */
const CARRYING_FILES = {
  dataTransfer: { types: ["Files"], files: [], dropEffect: "none" },
};

/**
 * 渲染一个附件行.
 * @returns 行元素.
 */
async function renderRow(): Promise<HTMLElement> {
  const environment = await createEntryTestEnvironment();
  render(
    <ul>
      <AttachmentRow
        attachment={ATTACHMENT}
        onPreview={NO_OP}
        onOpen={NO_OP}
        onSaveAs={NO_OP}
        onDelete={NO_OP}
      />
    </ul>,
    { wrapper: environment.Providers },
  );
  return screen.getByRole("listitem");
}

/**
 * 渲染附件拖放区.
 * @returns 拖放区元素.
 */
function renderZone(): HTMLElement {
  render(
    <AttachmentDropZone
      label="附件"
      dropHint="松开以添加"
      isDisabled={false}
      onDropFiles={NO_OP}
    >
      内容
    </AttachmentDropZone>,
  );
  return screen.getByRole("region", { name: "附件" });
}

describe("附件行的状态过渡", () => {
  it("悬停底色和快档状态过渡在同一个元素上", async () => {
    const row = await renderRow();

    expectMotionClasses(row, FAST_STATE_TRANSITION);
    expect(row.classList.contains("hover:bg-muted/50")).toBe(true);
    expectNoClassContaining(row, ["transition-all", "transition-["]);
  });

  it("行尾操作按钮继承快档过渡", async () => {
    await renderRow();

    expectMotionClasses(
      screen.getByRole("button", { name: /删除/ }),
      FAST_STATE_TRANSITION,
    );
  });
});

describe("附件拖放区的高亮过渡", () => {
  it("拖入前后边框与底色的变化都走快档状态过渡", () => {
    const zone = renderZone();
    expectMotionClasses(zone, FAST_STATE_TRANSITION);
    expect(zone.classList.contains("border-border")).toBe(true);

    fireEvent.dragEnter(zone, CARRYING_FILES);

    expectMotionClasses(zone, FAST_STATE_TRANSITION);
    expect(Array.from(zone.classList)).toEqual(
      expect.arrayContaining(["border-primary", "bg-muted"]),
    );
  });

  it("拖着文件悬在区域上时提示文字快档淡入, 平时只给读屏软件", () => {
    const zone = renderZone();
    const hint = screen.getByRole("status");
    expect(hint.classList.contains("sr-only")).toBe(true);
    expectNoClassContaining(hint, ["animate-in"]);

    fireEvent.dragEnter(zone, CARRYING_FILES);

    expect(hint.classList.contains("sr-only")).toBe(false);
    expectMotionClasses(hint, FADE_IN_MOTION);
  });

  it("拖入后离开, 高亮类和淡入类都消失, 过渡类还在", () => {
    const zone = renderZone();
    const hint = screen.getByRole("status");
    fireEvent.dragEnter(zone, CARRYING_FILES);

    fireEvent.dragLeave(zone, CARRYING_FILES);

    expectMotionClasses(zone, FAST_STATE_TRANSITION);
    expect(zone.classList.contains("border-primary")).toBe(false);
    expectNoClassContaining(hint, ["animate-in"]);
  });
});
