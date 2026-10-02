import { describe, expect, it, vi } from "vitest";

import { MAX_QR_IMAGE_BYTES } from "@shared/entries/totp-config";

import { createBarcodeImage } from "../testing/qr-image-fixture";
import { createQrDecoder, resolveZxingWasmFile } from "./qr-decoder";

/**
 * 测试用的 otpauth 链接, 编码进二维码.
 */
const OTPAUTH_LINK =
  "otpauth://totp/ACME:alice@example.test?secret=JBSWY3DPEHPK3PXP&issuer=ACME&digits=8&period=60";

/**
 * 测试里的解码器与它的失败回调间谍.
 */
interface DecoderWithSpy {
  /**
   * 被测的解码函数.
   */
  readonly decode: ReturnType<typeof createQrDecoder>;
  /**
   * 失败回调的间谍.
   */
  readonly onFailure: ReturnType<typeof vi.fn<(error: unknown) => void>>;
}

/**
 * 创建用真实 wasm 文件的解码器, 返回解码器与失败回调的间谍.
 * @returns 解码器与失败回调.
 */
function createDecoderWithSpy(): DecoderWithSpy {
  const onFailure = vi.fn<(error: unknown) => void>();
  const decode = createQrDecoder({
    wasmFile: resolveZxingWasmFile(),
    onFailure,
  });
  return { decode, onFailure };
}

describe("createQrDecoder 解码二维码图片", () => {
  it("读出二维码里的 otpauth 链接, 原样返回", async () => {
    const { decode } = createDecoderWithSpy();

    const result = await decode(await createBarcodeImage(OTPAUTH_LINK));

    expect(result).toEqual({ ok: true, value: OTPAUTH_LINK });
  });

  it("同一个解码器可以连续解码多张图片", async () => {
    const { decode } = createDecoderWithSpy();

    const first = await decode(await createBarcodeImage("first-text"));
    const second = await decode(await createBarcodeImage("second-text"));

    expect(first).toEqual({ ok: true, value: "first-text" });
    expect(second).toEqual({ ok: true, value: "second-text" });
  });

  it("二维码里是中文时也能读出", async () => {
    const { decode } = createDecoderWithSpy();

    const result = await decode(await createBarcodeImage("验证码 123456"));

    expect(result).toEqual({ ok: true, value: "验证码 123456" });
  });
});

describe("createQrDecoder 读不到二维码", () => {
  it("不是图片的字节, 不是二维码的条码, 都是 invalid-input", async () => {
    const { decode, onFailure } = createDecoderWithSpy();

    const notImage = await decode(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
    const otherBarcode = await decode(
      await createBarcodeImage("12345678", "Code128"),
    );

    expect(notImage).toEqual({ ok: false, reason: "invalid-input" });
    expect(otherBarcode).toEqual({ ok: false, reason: "invalid-input" });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("图片为空或超过上限时不解码, 直接是 invalid-input", async () => {
    const { decode, onFailure } = createDecoderWithSpy();

    const empty = await decode(new Uint8Array(0));
    const oversized = await decode(new Uint8Array(MAX_QR_IMAGE_BYTES + 1));

    expect(empty).toEqual({ ok: false, reason: "invalid-input" });
    expect(oversized).toEqual({ ok: false, reason: "invalid-input" });
    expect(onFailure).not.toHaveBeenCalled();
  });
});

describe("createQrDecoder 意外失败", () => {
  it("wasm 文件读不到时通知回调并返回意外错误", async () => {
    const onFailure = vi.fn<(error: unknown) => void>();
    const decode = createQrDecoder({
      wasmFile: "Z:\\does-not-exist\\zxing_reader.wasm",
      onFailure,
    });

    const result = await decode(await createBarcodeImage("text"));

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
