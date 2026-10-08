import type { ReactNode } from "react";

import {
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
  COLLAPSIBLE_TEXT_BASE_CLASSES,
} from "@renderer/components/ui/collapse-motion";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
import { cn } from "@renderer/lib/class-names";

/**
 * 可折叠文字区的属性.
 */
interface CollapsibleTextProps {
  /**
   * 外层元素的 `data-slot` 取值, 用来在测试和样式里定位.
   */
  readonly slot: string;
  /**
   * 所在区域是否折叠.
   */
  readonly isCollapsed: boolean;
  /**
   * 外层元素在两种状态下的类名: 展开时占满剩余宽度, 折叠时份额归零.
   */
  readonly stateClasses: Readonly<Record<CollapseState, string>>;
  /**
   * 追加给内层淡入淡出元素的类名, 例如文字自己的排布.
   */
  readonly contentClassName?: string;
  /**
   * 文字区里的内容.
   */
  readonly children: ReactNode;
}

/**
 * 图标之后的文字区: 外层按伸缩份额占满或让出剩余宽度, 内层按透明度淡入淡出, 两层时长不同.
 * 折叠后文字区不占位也不可见, 但不加 `aria-hidden`, 文字仍是所在按钮的无障碍名称. 侧栏的行
 * 与设置按钮共用.
 * @param props 组件属性.
 * @returns 文字区元素.
 */
export function CollapsibleText(
  props: CollapsibleTextProps,
): React.JSX.Element {
  const state: CollapseState = props.isCollapsed ? "collapsed" : "expanded";
  return (
    <span
      data-slot={props.slot}
      className={cn(COLLAPSIBLE_TEXT_BASE_CLASSES, props.stateClasses[state])}
    >
      <span
        className={cn(
          COLLAPSE_FADE_TRANSITION,
          COLLAPSE_FADE_CLASSES[state],
          props.contentClassName,
        )}
      >
        {props.children}
      </span>
    </span>
  );
}
