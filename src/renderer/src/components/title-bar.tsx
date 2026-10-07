import type { ReactNode } from "react";

/**
 * 标题栏的属性.
 */
interface TitleBarProps {
  /**
   * 放在左侧的内容, 例如应用名称与图标.
   */
  readonly leading: ReactNode;
  /**
   * 放在右侧的内容, 例如窗口按钮组.
   */
  readonly trailing: ReactNode;
}

/**
 * 窗口顶部的标题栏: 通栏一行, 左侧放应用标识, 右侧放窗口按钮. 整条标为拖动区域, 拖动空白处移动窗口,
 * 双击空白处最大化或还原; 右侧内容自己标出不拖动的区域. 用 `div` 而不是 `header`, 不与三栏界面的
 * 顶栏争 `banner` 角色. 打印时隐藏.
 * @param props 组件属性.
 * @returns 标题栏元素.
 */
export function TitleBar(props: TitleBarProps): React.JSX.Element {
  return (
    <div
      data-slot="title-bar"
      className="app-region-drag flex h-(--titlebar-height) shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar text-sidebar-foreground select-none print:hidden"
    >
      {props.leading}
      {props.trailing}
    </div>
  );
}
