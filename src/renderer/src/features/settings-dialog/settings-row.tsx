/**
 * 设置行的属性.
 */
interface SettingsRowProps {
  /**
   * 行的名称, 由调用方按当前语言提供.
   */
  readonly name: string;
  /**
   * 行的一句说明, 由调用方按当前语言提供.
   */
  readonly description: string;
  /**
   * 放在行右侧的操作元素, 例如一个按钮.
   */
  readonly action: React.ReactNode;
}

/**
 * 设置行: 左侧是名称与一句说明, 右侧是一个操作元素. 说明较长时在左侧换行, 操作元素保持原有宽度.
 * @param props 组件属性.
 * @returns 设置行元素.
 */
export function SettingsRow(props: SettingsRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium">{props.name}</p>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </div>
      <div className="shrink-0">{props.action}</div>
    </div>
  );
}
