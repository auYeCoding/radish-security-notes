import { FileIcon, FileTerminalIcon, ImageIcon } from "lucide-react";

import {
  classifyAttachment,
  type AttachmentKind,
} from "@shared/attachments/attachment-kind";

/**
 * 每个附件类别对应的图标.
 */
const KIND_ICONS: Readonly<Record<AttachmentKind, typeof FileIcon>> = {
  image: ImageIcon,
  executable: FileTerminalIcon,
  other: FileIcon,
};

/**
 * 附件类型图标的属性.
 */
interface AttachmentKindIconProps {
  /**
   * 附件名称, 类别由它的扩展名推出.
   */
  readonly name: string;
}

/**
 * 附件的类型图标: 图片, 可执行类与其它三类各一个图标, 只作装饰, 对读屏软件隐藏.
 * @param props 组件属性.
 * @returns 图标元素.
 */
export function AttachmentKindIcon(
  props: AttachmentKindIconProps,
): React.JSX.Element {
  const Icon = KIND_ICONS[classifyAttachment(props.name)];
  return (
    <Icon
      aria-hidden="true"
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
}
