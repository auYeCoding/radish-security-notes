import { useCallback, useEffect, useState } from "react";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { useAttachmentBridge } from "@renderer/stores/use-attachment-bridge";

/**
 * 附件列表的读取状态: 读取中, 已读到, 读取失败.
 */
export type AttachmentListStatus = "loading" | "ready" | "failed";

/**
 * 一个条目的附件列表与它的本地更新方法.
 */
export interface AttachmentList {
  /**
   * 读取状态.
   */
  readonly status: AttachmentListStatus;
  /**
   * 已读到的附件元数据, 按添加顺序排列, 读取中或失败时为空数组.
   */
  readonly attachments: readonly AttachmentMeta[];
  /**
   * 把新添加的附件接在列表末尾.
   * @param added 新添加的附件元数据.
   */
  readonly append: (added: readonly AttachmentMeta[]) => void;
  /**
   * 把一个已删除的附件从列表里移走.
   * @param attachmentId 附件编号.
   */
  readonly removeById: (attachmentId: string) => void;
}

/**
 * 列表的内部状态.
 */
interface ListState {
  /**
   * 读取状态.
   */
  readonly status: AttachmentListStatus;
  /**
   * 附件元数据.
   */
  readonly attachments: readonly AttachmentMeta[];
}

/**
 * 读取中的初始状态.
 */
const LOADING_STATE: ListState = { status: "loading", attachments: [] };

/**
 * 挂载时读取一个条目的附件元数据, 条目变化时重新读取; 之后添加与删除在本地更新列表, 不再重读.
 * 读取只拿到元数据, 附件内容留在主进程.
 * @param entryId 条目编号.
 * @returns 附件列表与更新方法.
 */
export function useAttachmentList(entryId: string): AttachmentList {
  const bridge = useAttachmentBridge();
  const [state, setState] = useState<ListState>(LOADING_STATE);
  useEffect(() => {
    let isCurrent = true;
    const load = async (): Promise<void> => {
      const result = await bridge.list(entryId);
      if (isCurrent) {
        setState(
          result.ok
            ? { status: "ready", attachments: result.value }
            : { status: "failed", attachments: [] },
        );
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [bridge, entryId]);
  const append = useCallback((added: readonly AttachmentMeta[]): void => {
    setState((current) => ({
      status: current.status,
      attachments: [...current.attachments, ...added],
    }));
  }, []);
  const removeById = useCallback((attachmentId: string): void => {
    setState((current) => ({
      status: current.status,
      attachments: current.attachments.filter(
        (attachment) => attachment.id !== attachmentId,
      ),
    }));
  }, []);
  return { ...state, append, removeById };
}
