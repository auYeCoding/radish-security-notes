import { useCallback, useState } from "react";

import type { TotpBridge } from "@shared/entries/totp-bridge";
import { MAX_QR_IMAGE_BYTES } from "@shared/entries/totp-config";
import { parseTotpInput } from "@shared/entries/totp-input-parser";

import { useTotpBridge } from "@renderer/stores/use-totp-bridge";

/**
 * 读取二维码图片的结果, 显示时再换成当前语言的文案.
 */
export type TotpImageImportStatus =
  "reading" | "read" | "unreadable" | "notTotp" | "tooLarge" | "failed";

/**
 * 读取二维码图片的状态与方法.
 */
export interface TotpImageImport {
  /**
   * 最近一次读取的结果, 还没有读取过时为 undefined.
   */
  readonly status: TotpImageImportStatus | undefined;
  /**
   * 读取一张二维码图片: 图片字节交给主进程解码, 读到有效的 TOTP 链接时交给回调.
   * @param image 图片文件.
   * @returns 读取完成后兑现.
   */
  readonly importImage: (image: Blob) => Promise<void>;
}

/**
 * 一张二维码图片的读取结果.
 */
interface ImageOutcome {
  /**
   * 读取的结果.
   */
  readonly status: TotpImageImportStatus;
  /**
   * 读到的 TOTP 链接, 没有读到有效链接时为 undefined.
   */
  readonly link?: string;
}

/**
 * 读取二维码图片并取出里面的 TOTP 链接: 图片过大不送去解码, 解码成功后链接还要是受支持的
 * TOTP 配置.
 * @param decode 主进程的解码方法.
 * @param image 图片文件.
 * @returns 读取结果.
 */
async function readImage(
  decode: TotpBridge["decodeQrImage"],
  image: Blob,
): Promise<ImageOutcome> {
  if (image.size > MAX_QR_IMAGE_BYTES) {
    return { status: "tooLarge" };
  }
  const result = await decode(new Uint8Array(await image.arrayBuffer()));
  if (!result.ok) {
    return {
      status: result.reason === "invalid-input" ? "unreadable" : "failed",
    };
  }
  return parseTotpInput(result.value).ok
    ? { status: "read", link: result.value }
    : { status: "notTotp" };
}

/**
 * 跟踪二维码图片的读取状态.
 * @param onLink 读到有效的 TOTP 链接时的回调.
 * @returns 读取状态与读取方法.
 */
export function useTotpImageImport(
  onLink: (link: string) => void,
): TotpImageImport {
  const bridge = useTotpBridge();
  const [status, setStatus] = useState<TotpImageImportStatus | undefined>(
    undefined,
  );
  const importImage = useCallback(
    async (image: Blob): Promise<void> => {
      setStatus("reading");
      const outcome = await readImage(bridge.decodeQrImage, image);
      setStatus(outcome.status);
      if (outcome.link !== undefined) {
        onLink(outcome.link);
      }
    },
    [bridge, onLink],
  );
  return { status, importImage };
}
