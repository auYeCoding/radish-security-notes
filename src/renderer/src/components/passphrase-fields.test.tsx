import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import { PassphraseFields } from "./passphrase-fields";

/**
 * 测试用的文案.
 */
const LABELS = {
  passphrase: "口令",
  confirmation: "确认",
  hint: "至少 12 个字符",
  tooShort: "太短了",
  mismatch: "不一致",
};

/**
 * 在偏好环境里渲染口令字段.
 * @param props 要覆盖的属性.
 */
async function renderFields(
  props: Partial<React.ComponentProps<typeof PassphraseFields>> = {},
): Promise<void> {
  const { Providers } = await createPreferencesTestEnvironment();
  render(
    <PassphraseFields
      passphrase=""
      confirmation=""
      problem={undefined}
      labels={LABELS}
      onPassphraseChange={vi.fn()}
      onConfirmationChange={vi.fn()}
      {...props}
    />,
    { wrapper: Providers },
  );
}

describe("PassphraseFields 显示", () => {
  it("显示口令与确认口令两个输入框和说明", async () => {
    await renderFields();
    expect(screen.getByLabelText("口令")).toBeDefined();
    expect(screen.getByLabelText("确认")).toBeDefined();
    expect(screen.getByText("至少 12 个字符")).toBeDefined();
  });

  it("口令太短的提示只在口令框有内容时出现", async () => {
    await renderFields({ problem: "too-short" });
    expect(screen.queryByText("太短了")).toBeNull();
  });

  it("口令框有内容且太短时提示, 确认框有内容且不一致时提示", async () => {
    await renderFields({
      passphrase: "abc",
      confirmation: "abd",
      problem: "too-short",
    });
    expect(screen.getByText("太短了")).toBeDefined();
    expect(screen.queryByText("不一致")).toBeNull();
  });

  it("不一致的提示出现在确认框有内容时", async () => {
    await renderFields({
      passphrase: "a".repeat(12),
      confirmation: "b",
      problem: "mismatch",
    });
    expect(screen.getByText("不一致")).toBeDefined();
  });
});

describe("PassphraseFields 输入", () => {
  it("输入时把新内容交给对应的回调", async () => {
    const onPassphraseChange = vi.fn();
    const onConfirmationChange = vi.fn();
    await renderFields({ onPassphraseChange, onConfirmationChange });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("口令"), "a");
    await user.type(screen.getByLabelText("确认"), "b");

    expect(onPassphraseChange).toHaveBeenCalledWith("a");
    expect(onConfirmationChange).toHaveBeenCalledWith("b");
  });
});
