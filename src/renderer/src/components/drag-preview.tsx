/**
 * 拖拽预览的属性.
 */
interface DragPreviewProps {
  /**
   * 预览上显示的名称.
   */
  readonly label: string;
}

/**
 * 拖拽过程中跟随指针的预览: 一块带边框的小卡片, 显示被拖拽对象的名称.
 * @param props 组件属性.
 * @returns 预览元素.
 */
export function DragPreview(props: DragPreviewProps): React.JSX.Element {
  return (
    <div className="max-w-(--sidebar-width) cursor-grabbing truncate rounded-lg border border-border bg-popover px-3 py-2 text-sm font-semibold text-popover-foreground">
      {props.label}
    </div>
  );
}
