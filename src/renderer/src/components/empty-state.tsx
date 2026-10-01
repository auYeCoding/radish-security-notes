/**
 * 空状态的属性.
 */
interface EmptyStateProps {
  /**
   * 空状态的说明文字.
   */
  readonly message: string;
}

/**
 * 空状态说明: 区域里没有内容时显示的一行辅助文字.
 * @param props 组件属性.
 * @returns 空状态元素.
 */
export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  return (
    <p className="px-4 py-2 text-sm text-muted-foreground">{props.message}</p>
  );
}
