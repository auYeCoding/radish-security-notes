import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { prepareZXingModule, writeBarcode } from "zxing-wasm/writer";

/**
 * zxing-wasm 写入器的 wasm 文件在包里的导出路径.
 */
const ZXING_WRITER_WASM_SPECIFIER = "zxing-wasm/writer/zxing_writer.wasm";

/**
 * 生成的条码图片里每个模块占的像素数, 放大后读取器更容易识别.
 */
const BARCODE_SCALE = 6;

/**
 * 是否已经准备好写入器模块.
 */
let isWriterPrepared = false;

/**
 * 条码图片的格式.
 */
export type BarcodeImageFormat = "QRCode" | "Code128";

/**
 * 第一次生成图片前读入写入器的 wasm 文件, 代替默认的从网络取址.
 */
function prepareWriterOnce(): void {
  if (isWriterPrepared) {
    return;
  }
  const wasmFile = createRequire(__filename).resolve(
    ZXING_WRITER_WASM_SPECIFIER,
  );
  prepareZXingModule({
    overrides: { wasmBinary: Uint8Array.from(readFileSync(wasmFile)).buffer },
  });
  isWriterPrepared = true;
}

/**
 * 生成一张条码的 PNG 图片, 测试里用来给二维码解码器造输入.
 * @param text 条码里编码的文本.
 * @param format 条码格式, 默认是二维码.
 * @returns PNG 图片的字节.
 * @throws Error 当写入器没有生成图片时.
 */
export async function createBarcodeImage(
  text: string,
  format: BarcodeImageFormat = "QRCode",
): Promise<Uint8Array> {
  prepareWriterOnce();
  const { image, error } = await writeBarcode(text, {
    format,
    scale: BARCODE_SCALE,
    withQuietZones: true,
  });
  if (image === null) {
    throw new Error(`没有生成条码图片: ${error}`);
  }
  return new Uint8Array(await image.arrayBuffer());
}
