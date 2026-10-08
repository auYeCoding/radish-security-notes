import { render, screen } from "@testing-library/react";
import { describe, it } from "vitest";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import {
  ANCHORED_POPUP_MOTION,
  MODAL_POPUP_MOTION,
  OVERLAY_MOTION,
} from "./popup-motion";

/**
 * 旧写法留下的类名片段: 写死的 100ms 时长, 滑入位移, 以及 Radix 遗留的状态属性.
 */
const LEGACY_FRAGMENTS = ["duration-100", "slide-in-from", "delayed-open"];

describe("对话框的进入与退出动画", () => {
  it("遮罩淡入淡出, 面板居中淡入并缩放, 都用基础档", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent closeLabel="关闭">
          <DialogTitle>标题</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await screen.findByRole("dialog");

    const overlay = document.querySelector("[data-slot=dialog-overlay]");
    const content = document.querySelector("[data-slot=dialog-content]");
    expectMotionClasses(overlay, OVERLAY_MOTION);
    expectMotionClasses(content, MODAL_POPUP_MOTION);
    expectNoClassContaining(overlay, LEGACY_FRAGMENTS);
    expectNoClassContaining(content, LEGACY_FRAGMENTS);
  });
});

describe("确认框的进入与退出动画", () => {
  it("遮罩淡入淡出, 面板居中淡入并缩放, 都用基础档", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>删除后无法恢复</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await screen.findByRole("alertdialog");

    const overlay = document.querySelector("[data-slot=alert-dialog-overlay]");
    const content = document.querySelector("[data-slot=alert-dialog-content]");
    expectMotionClasses(overlay, OVERLAY_MOTION);
    expectMotionClasses(content, MODAL_POPUP_MOTION);
    expectNoClassContaining(overlay, LEGACY_FRAGMENTS);
    expectNoClassContaining(content, LEGACY_FRAGMENTS);
  });
});

describe("悬停提示的进入与退出动画", () => {
  it("从触发点淡入并缩放, 用快档, 没有滑入与旧状态属性类名", async () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>触发</TooltipTrigger>
        <TooltipContent>提示文字</TooltipContent>
      </Tooltip>,
    );
    await screen.findByText("提示文字");

    const content = document.querySelector("[data-slot=tooltip-content]");
    expectMotionClasses(content, ANCHORED_POPUP_MOTION);
    expectNoClassContaining(content, LEGACY_FRAGMENTS);
  });
});
