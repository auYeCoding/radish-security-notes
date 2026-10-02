import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

import {
  entryFailed,
  entrySucceeded,
  type EntryResult,
} from "@shared/entries/entry-result";
import { MAX_QR_IMAGE_BYTES } from "@shared/entries/totp-config";

/**
 * zxing-wasm 读取器的 wasm 文件在包里的导出路径, 由包的 `exports` 字段公开.
 */
const ZXING_READER_WASM_SPECIFIER = "zxing-wasm/reader/zxing_reader.wasm";

/**
 * 解码二维码时的读取选项: 只认 QRCode 格式, 多试几种二值化, 一张图只取一个二维码.
 */
const QR_READER_OPTIONS = {
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
} as const;

/**
 * 解码一张二维码图片的函数.
 */
export type QrImageDecoder = (
  image: Uint8Array,
) => Promise<EntryResult<string>>;

/**
 * 创建二维码解码器需要的信息.
 */
export interface QrDecoderOptions {
  /**
   * zxing-wasm 读取器的 wasm 文件路径.
   */
  readonly wasmFile: string;
  /**
   * 解码意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 解析 zxing-wasm 读取器的 wasm 文件在磁盘上的路径. 打包后路径在 asar 里, 读取文件时由
 * Electron 透明处理.
 * @returns wasm 文件的绝对路径.
 */
export function resolveZxingWasmFile(): string {
  return createRequire(__filename).resolve(ZXING_READER_WASM_SPECIFIER);
}

/**
 * 读入 wasm 文件的字节, 交给 zxing-wasm 代替默认的从网络取址.
 * @param wasmFile wasm 文件路径.
 * @returns wasm 字节.
 */
function readWasmBinary(wasmFile: string): ArrayBuffer {
  return Uint8Array.from(readFileSync(wasmFile)).buffer;
}

/**
 * 创建二维码解码器: 第一次解码时读入 wasm 文件并准备模块, 之后复用. 图片为空或超过上限,
 * 或读不到有效的二维码时返回 invalid-input 的失败结果, 解码抛出错误时通知回调并返回
 * 意外错误的失败结果.
 * @param options wasm 文件路径与失败回调.
 * @returns 二维码解码函数.
 */
export function createQrDecoder(options: QrDecoderOptions): QrImageDecoder {
  let isPrepared = false;
  return async (image) => {
    if (image.byteLength === 0 || image.byteLength > MAX_QR_IMAGE_BYTES) {
      return entryFailed("invalid-input");
    }
    try {
      if (!isPrepared) {
        prepareZXingModule({
          overrides: { wasmBinary: readWasmBinary(options.wasmFile) },
        });
        isPrepared = true;
      }
      const results = await readBarcodes(image, {
        ...QR_READER_OPTIONS,
        formats: [...QR_READER_OPTIONS.formats],
      });
      const found = results.find((result) => result.isValid);
      return found === undefined
        ? entryFailed("invalid-input")
        : entrySucceeded(found.text);
    } catch (error) {
      options.onFailure(error);
      return entryFailed("unexpected-error");
    }
  };
}
