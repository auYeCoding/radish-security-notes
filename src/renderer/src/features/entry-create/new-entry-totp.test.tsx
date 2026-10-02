import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { entrySucceeded } from "@shared/entries/entry-result";
import { MAX_QR_IMAGE_BYTES } from "@shared/entries/totp-config";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { failingWith } from "@renderer/testing/fake-totp-bridge";
import { renderOpenedNewEntryForm } from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 测试用的 otpauth 链接, 带算法, 位数与周期参数.
 */
const LINK =
  "otpauth://totp/ACME:alice?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256&digits=8&period=60";

/**
 * 渲染新建入口, 打开对话框并选通用登录, 填好名称.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderForm(
  options?: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  const environment = await renderOpenedNewEntryForm(
    <NewEntryTrigger />,
    "通用登录",
    options,
  );
  await userEvent.setup().type(screen.getByLabelText("名称"), "邮箱");
  return environment;
}

/**
 * 取 TOTP 输入框.
 * @returns 输入框元素.
 */
function getTotpInput(): HTMLInputElement {
  return screen.getByLabelText("TOTP 密钥或链接", {
    selector: "input",
  }) as HTMLInputElement;
}

/**
 * 取选择二维码图片的隐藏文件输入框.
 * @returns 文件输入框元素.
 */
function getImageInput(): HTMLInputElement {
  return screen.getByLabelText("选择二维码图片", {
    selector: "input",
  }) as HTMLInputElement;
}

describe("新建表单 TOTP 录入", () => {
  it("输入框默认遮罩, 点击显示后是明文", async () => {
    await renderForm();
    const user = userEvent.setup();

    expect(getTotpInput().type).toBe("password");
    await user.click(
      screen.getByRole("button", { name: "显示 TOTP 密钥或链接" }),
    );

    expect(getTotpInput().type).toBe("text");
  });

  it("键入 Base32 密钥后保存, 输入原样交给桥, 新条目带 TOTP", async () => {
    const { entryBridge, entryStore } = await renderForm();
    const user = userEvent.setup();

    await user.type(getTotpInput(), "jbsw y3dp ehpk 3pxp");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "邮箱", totp: "jbsw y3dp ehpk 3pxp" }),
    );
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { hasTotp: true },
    });
  });

  it("粘贴 otpauth 链接后保存, 链接原样交给桥", async () => {
    const { entryBridge } = await renderForm();
    const user = userEvent.setup();

    await user.click(getTotpInput());
    await user.paste(LINK);
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({ totp: LINK }),
    );
  });

  it("不填 TOTP 也能保存, 交给桥的是空串", async () => {
    const { entryBridge } = await renderForm();

    await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({ totp: "" }),
    );
  });
});

describe("新建表单 TOTP 校验", () => {
  it("密钥不合法时显示提示, 对话框保持打开且不保存", async () => {
    const { entryBridge } = await renderForm();
    const user = userEvent.setup();

    await user.type(getTotpInput(), "not base32!");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("TOTP 密钥或链接不合法. 请检查后重试."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "新建条目" })).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });

  it("链接类型, 算法, 位数或周期不受支持时给出对应提示且不保存", async () => {
    const { entryBridge } = await renderForm();
    const user = userEvent.setup();

    await user.type(
      getTotpInput(),
      "otpauth://hotp/a?secret=JBSWY3DPEHPK3PXP&counter=1",
    );
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText(/^暂不支持这个链接\. 支持 TOTP 类型/),
    ).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });

  it("改成合法的输入后可以保存", async () => {
    const { entryBridge } = await renderForm();
    const user = userEvent.setup();
    await user.type(getTotpInput(), "bad!");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText("TOTP 密钥或链接不合法. 请检查后重试.");

    await user.clear(getTotpInput());
    await user.type(getTotpInput(), "JBSWY3DPEHPK3PXP");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(entryBridge.create).toHaveBeenCalledTimes(1));
  });
});

describe("新建表单 二维码图片录入", () => {
  it("选择图片后字节交给主进程解码, 读到的链接填回输入框并提示, 保存后交给桥", async () => {
    const { entryBridge, totpBridge } = await renderForm({
      totpBridgeOverrides: {
        decodeQrImage: vi.fn(() => Promise.resolve(entrySucceeded(LINK))),
      },
    });
    const user = userEvent.setup();
    const image = new File([Uint8Array.from([1, 2, 3])], "qr.png", {
      type: "image/png",
    });

    await user.upload(getImageInput(), image);

    expect(await screen.findByText("已读取二维码, 保存后生效.")).toBeDefined();
    expect(totpBridge.decodeQrImage).toHaveBeenCalledWith(
      Uint8Array.from([1, 2, 3]),
    );
    expect(getTotpInput().value).toBe(LINK);
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(entryBridge.create).toHaveBeenCalledWith(
        expect.objectContaining({ totp: LINK }),
      ),
    );
  });

  it("在输入框里粘贴二维码截图也会解码, 不影响文本粘贴", async () => {
    const { totpBridge } = await renderForm({
      totpBridgeOverrides: {
        decodeQrImage: vi.fn(() => Promise.resolve(entrySucceeded(LINK))),
      },
    });
    const image = new File([Uint8Array.from([9, 8])], "image.png", {
      type: "image/png",
    });

    fireEvent.paste(getTotpInput(), { clipboardData: { files: [image] } });

    await waitFor(() => expect(getTotpInput().value).toBe(LINK));
    expect(totpBridge.decodeQrImage).toHaveBeenCalledWith(
      Uint8Array.from([9, 8]),
    );
  });
});

describe("新建表单 二维码读取失败", () => {
  it.each([
    ["invalid-input", "没有读到二维码, 请换一张更清晰的图片."],
    ["unexpected-error", "读取二维码失败. 请重试."],
  ] as const)(
    "主进程报告 %s 时提示 %s, 输入框不变",
    async (reason, message) => {
      await renderForm({
        totpBridgeOverrides: { decodeQrImage: failingWith(reason) },
      });

      await userEvent
        .setup()
        .upload(
          getImageInput(),
          new File(["x"], "qr.png", { type: "image/png" }),
        );

      expect(await screen.findByText(message)).toBeDefined();
      expect(getTotpInput().value).toBe("");
    },
  );

  it("二维码里不是有效的 TOTP 链接时提示, 不填回输入框", async () => {
    await renderForm({
      totpBridgeOverrides: {
        decodeQrImage: vi.fn(() =>
          Promise.resolve(entrySucceeded("https://example.test/not-totp")),
        ),
      },
    });

    await userEvent
      .setup()
      .upload(
        getImageInput(),
        new File(["x"], "qr.png", { type: "image/png" }),
      );

    expect(
      await screen.findByText("这张二维码里不是可用的 TOTP 链接."),
    ).toBeDefined();
    expect(getTotpInput().value).toBe("");
  });
});

describe("新建表单 二维码图片过大", () => {
  it("图片超过上限时提示, 不送去解码", async () => {
    const { totpBridge } = await renderForm();
    const oversized = new File(
      [new Uint8Array(MAX_QR_IMAGE_BYTES + 1)],
      "big.png",
      { type: "image/png" },
    );

    await userEvent.setup().upload(getImageInput(), oversized);

    expect(
      await screen.findByText("图片太大, 请选择 10 MB 以内的图片."),
    ).toBeDefined();
    expect(totpBridge.decodeQrImage).not.toHaveBeenCalled();
  });
});
