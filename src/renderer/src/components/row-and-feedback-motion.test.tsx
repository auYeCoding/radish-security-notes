import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FolderIcon } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FADE_IN_MOTION,
  FAST_STATE_TRANSITION,
} from "@renderer/components/ui/state-motion";
import { useDropTarget } from "@renderer/lib/drag-drop/use-drop-target";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";
import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import { CopyButton } from "./copy-button";
import { SidebarNavItem } from "./sidebar-nav-item";
import { TotpCodeButton } from "./totp-code-button";
import { TotpCountdown } from "./totp-countdown";

vi.mock("@renderer/lib/drag-drop/use-drop-target", () => ({
  useDropTarget: vi.fn(),
}));

/**
 * 拖拽源没有悬在放置目标上时, 放置目标钩子的返回值.
 */
const NOT_OVER = { setNodeRef: () => undefined, isOver: false };

/**
 * 拖拽源悬在放置目标上时, 放置目标钩子的返回值.
 */
const IS_OVER = { setNodeRef: () => undefined, isOver: true };

/**
 * 渲染一行侧栏入口.
 * @param isSelected 这一行是否被选中.
 * @returns 行元素.
 */
async function renderSidebarRow(isSelected: boolean): Promise<HTMLElement> {
  const environment = await createPreferencesTestEnvironment();
  render(
    <ul>
      <SidebarNavItem
        label="工作"
        icon={<FolderIcon aria-hidden="true" />}
        count={3}
        isSelected={isSelected}
        onSelect={() => undefined}
        dropTargetId="folder-work"
      />
    </ul>,
    { wrapper: environment.Providers },
  );
  return screen.getByRole("listitem");
}

/**
 * 渲染倒计时.
 * @param isEnding 是否临近换码.
 */
function renderCountdown(isEnding: boolean): void {
  render(
    <TotpCountdown
      remainingSeconds={isEnding ? 5 : 20}
      periodSeconds={30}
      isEnding={isEnding}
      remainingText={isEnding ? "还剩 5 秒" : "还剩 20 秒"}
      endingText="即将换码"
      progressLabel="距离换码的剩余时间"
    />,
  );
}

beforeEach(() => {
  vi.mocked(useDropTarget).mockReturnValue(NOT_OVER);
});

describe("侧栏行的状态过渡", () => {
  it("行容器带快档状态过渡, 选中竖条与底色在同一个元素上", async () => {
    const row = await renderSidebarRow(true);

    expectMotionClasses(row, FAST_STATE_TRANSITION);
    expect(Array.from(row.classList)).toEqual(
      expect.arrayContaining(["border-s-brand", "bg-muted"]),
    );
    expectNoClassContaining(row, ["transition-all", "transition-["]);
  });

  it("拖拽源悬在行上时的高亮与描边和过渡在同一个元素上", async () => {
    vi.mocked(useDropTarget).mockReturnValue(IS_OVER);
    const row = await renderSidebarRow(false);

    expectMotionClasses(row, FAST_STATE_TRANSITION);
    expect(Array.from(row.classList)).toEqual(
      expect.arrayContaining(["bg-accent", "ring-1", "ring-brand"]),
    );
  });

  it("没有被悬停的未选中行有过渡但没有高亮类", async () => {
    const row = await renderSidebarRow(false);

    expectMotionClasses(row, FAST_STATE_TRANSITION);
    expect(row.classList.contains("bg-accent")).toBe(false);
    expect(row.classList.contains("bg-muted")).toBe(false);
  });
});

describe("复制成功提示的淡入", () => {
  it("复制按钮成功后出现的对勾带快档淡入, 复制图标本身没有", async () => {
    render(
      <CopyButton
        label="复制账号"
        copiedLabel="已复制"
        onCopy={() => Promise.resolve(true)}
      />,
    );
    const button = screen.getByRole("button", { name: "复制账号" });
    expectNoClassContaining(button.querySelector("svg"), ["animate-in"]);

    await userEvent.setup().click(button);

    expectMotionClasses(button.querySelector("svg"), FADE_IN_MOTION);
  });

  it("验证码按钮成功后出现的提示带快档淡入", async () => {
    render(
      <TotpCodeButton
        code="123456"
        label="复制 验证码"
        copiedLabel="已复制"
        onCopy={() => Promise.resolve(true)}
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /^复制 验证码/ }));

    expectMotionClasses(screen.getAllByText("已复制")[0], FADE_IN_MOTION);
  });
});

describe("验证码倒计时的状态过渡", () => {
  it("剩余时间的强调色取快档状态过渡, 临近换码前后都在同一个元素上", () => {
    renderCountdown(true);

    const remaining = screen.getByText("还剩 5 秒");
    expectMotionClasses(remaining, FAST_STATE_TRANSITION);
    expect(remaining.classList.contains("font-semibold")).toBe(true);
  });

  it("没有临近换码时剩余时间也有过渡类, 没有强调类", () => {
    renderCountdown(false);

    const remaining = screen.getByText("还剩 20 秒");
    expectMotionClasses(remaining, FAST_STATE_TRANSITION);
    expect(remaining.classList.contains("font-semibold")).toBe(false);
  });

  it("临近换码的提示文字快档淡入", () => {
    renderCountdown(true);

    expectMotionClasses(screen.getByText("即将换码"), FADE_IN_MOTION);
  });

  it("进度条按秒跳变, 轨道与指示条都没有过渡", () => {
    renderCountdown(false);

    const bar = screen.getByRole("progressbar");
    expectNoClassContaining(bar, ["transition"]);
    expect(bar.querySelectorAll("[class*='transition']")).toHaveLength(0);
  });
});
