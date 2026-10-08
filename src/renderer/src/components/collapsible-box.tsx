import type { ReactNode } from "react";

import {
  COLLAPSE_BOX_AXIS_CLASSES,
  COLLAPSE_BOX_BASE_CLASSES,
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
} from "@renderer/components/ui/collapse-motion";
import type {
  CollapseAxis,
  CollapseState,
} from "@renderer/components/ui/collapse-motion";
import { cn } from "@renderer/lib/class-names";

/**
 * 可折叠盒子的属性.
 */
interface CollapsibleBoxProps {
  /**
   * 盒子当前是否展开.
   */
  readonly isExpanded: boolean;
  /**
   * 收放的方向: 沿宽度或沿高度.
   */
  readonly axis: CollapseAxis;
  /**
   * 折叠后是否对读屏软件隐藏并禁止聚焦与点击, 默认隐藏. 折叠后文字仍要读出来的内容传 `false`.
   */
  readonly isHiddenWhenCollapsed?: boolean;
  /**
   * 追加给内层淡入淡出元素的类名, 例如内容自己的排布与内边距.
   */
  readonly contentClassName?: string;
  /**
   * 盒子里的内容.
   */
  readonly children: ReactNode;
}

/**
 * 折叠后是否隐藏内容的默认值.
 */
const DEFAULT_HIDDEN_WHEN_COLLAPSED = true;

/**
 * 随开合状态收放尺寸并淡入淡出的盒子: 外层沿宽度或高度在自动尺寸与零之间过渡并裁掉溢出,
 * 内层只过渡透明度, 两层时长不同. 折叠后默认再加 `inert` 与 `aria-hidden`, 过渡一开始就不可
 * 聚焦与点击, 读屏软件也读不到. 行尾操作, 分区标题块, 分隔线块和空状态共用.
 * @param props 组件属性.
 * @returns 盒子元素.
 */
export function CollapsibleBox(props: CollapsibleBoxProps): React.JSX.Element {
  const state: CollapseState = props.isExpanded ? "expanded" : "collapsed";
  const isHidden =
    !props.isExpanded &&
    (props.isHiddenWhenCollapsed ?? DEFAULT_HIDDEN_WHEN_COLLAPSED);
  return (
    <div
      data-slot="collapsible-box"
      data-state={state}
      aria-hidden={isHidden ? true : undefined}
      inert={isHidden}
      className={cn(
        COLLAPSE_BOX_BASE_CLASSES,
        COLLAPSE_BOX_AXIS_CLASSES[props.axis][state],
      )}
    >
      <div
        className={cn(
          COLLAPSE_FADE_TRANSITION,
          COLLAPSE_FADE_CLASSES[state],
          props.contentClassName,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
