import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAttachmentBridge } from "@renderer/stores/use-attachment-bridge";

import { describeAttachmentFailure } from "./describe-attachment-failure";

/**
 * 预览读取中.
 */
export interface AttachmentPreviewLoading {
  /**
   * 读取状态, 读取中恒为 loading.
   */
  readonly status: "loading";
}

/**
 * 预览已读到.
 */
export interface AttachmentPreviewReady {
  /**
   * 读取状态, 已读到恒为 ready.
   */
  readonly status: "ready";
  /**
   * 图片的 data: 地址.
   */
  readonly dataUrl: string;
}

/**
 * 预览读取失败.
 */
export interface AttachmentPreviewFailed {
  /**
   * 读取状态, 失败恒为 failed.
   */
  readonly status: "failed";
  /**
   * 给用户看的失败文案.
   */
  readonly message: string;
}

/**
 * 一个图片附件预览的读取状态: 读取中, 已读到, 失败.
 */
export type AttachmentPreviewState =
  AttachmentPreviewLoading | AttachmentPreviewReady | AttachmentPreviewFailed;

/**
 * 挂载时让主进程读取一个图片附件的预览地址. 地址只放在这个状态里, 组件卸载后随之丢弃, 不进入
 * 任何全局状态.
 * @param attachmentId 附件编号.
 * @returns 预览的读取状态.
 */
export function useAttachmentPreview(
  attachmentId: string,
): AttachmentPreviewState {
  const bridge = useAttachmentBridge();
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<AttachmentPreviewState>({
    status: "loading",
  });
  useEffect(() => {
    let isCurrent = true;
    const load = async (): Promise<void> => {
      const result = await bridge.preview(attachmentId);
      if (isCurrent) {
        setState(
          result.ok
            ? { status: "ready", dataUrl: result.value }
            : {
                status: "failed",
                message: describeAttachmentFailure(result, t, i18n.language),
              },
        );
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [bridge, attachmentId, t, i18n.language]);
  return state;
}
