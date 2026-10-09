import type { ReactNode } from "react";

import {
  FADE_IN_MOTION,
  FAST_STATE_TRANSITION,
} from "@renderer/components/ui/state-motion";
import { cn } from "@renderer/lib/class-names";

import { useFileDrag } from "./use-file-drag";

/**
 * 附件拖放区的属性.
 */
interface AttachmentDropZoneProps {
  /**
   * 区域的无障碍名称.
   */
  readonly label: string;
  /**
   * 拖着文件悬在区域上时显示的提示.
   */
  readonly dropHint: string;
  /**
   * 是否暂不接受拖入, 例如上一次添加还在进行.
   */
  readonly isDisabled: boolean;
  /**
   * 放下文件时的回调, 文件不为空才会调用.
   */
  readonly onDropFiles: (files: readonly File[]) => void;
  /**
   * 区域里的内容.
   */
  readonly children: ReactNode;
}

/**
 * 附件拖放区: 包住附件区的内容, 接受从资源管理器拖入的文件. 拖着文件悬在区域上时边框变为主色虚线并
 * 显示提示, 提示同时通知读屏软件.
 * @param props 组件属性.
 * @returns 拖放区元素.
 */
export function AttachmentDropZone(
  props: AttachmentDropZoneProps,
): React.JSX.Element {
  const { isDragging, handlers } = useFileDrag(
    props.isDisabled,
    props.onDropFiles,
  );
  return (
    <section
      aria-label={props.label}
      className={cn(
        FAST_STATE_TRANSITION,
        "flex flex-col gap-3 rounded-lg border border-dashed p-3",
        isDragging ? "border-primary bg-muted" : "border-border",
      )}
      {...handlers}
    >
      {props.children}
      <p
        role="status"
        className={cn(
          "text-sm text-muted-foreground",
          isDragging ? FADE_IN_MOTION : "sr-only",
        )}
      >
        {isDragging ? props.dropHint : ""}
      </p>
    </section>
  );
}
