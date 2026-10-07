import type { ReactNode } from "react";

import { cn } from "@renderer/lib/class-names";

import {
  DEFAULT_GATE_FRAME_LAYOUT,
  type GateFrameLayout,
} from "./gate-frame-layout";

/**
 * 整屏页面外框的属性.
 */
interface GateFrameProps extends Partial<GateFrameLayout> {
  /**
   * 放在右上角的内容, 例如主题与语言切换.
   */
  readonly corner: ReactNode;
  /**
   * 居中显示的页面内容.
   */
  readonly children: ReactNode;
}

/**
 * 各内边距档位对应的类名.
 */
const GATE_FRAME_SPACING_CLASSES = {
  default: "p-6",
  roomy: "px-6 py-16",
} as const;

/**
 * 带打印套件的页面在打印时外框用的类名: 块级布局, 无最小高度, 无内边距.
 */
const GATE_FRAME_PRINT_KIT_CLASSES = "print:block print:min-h-0 print:p-0";

/**
 * 整屏页面的外框: 填满窗口框架里标题栏下方的内容区, 内容居中, 右上角放一组控件, 所以控件落在
 * 标题栏之下, 不与窗口按钮重叠. 引导页, 解锁页, 失败页与恢复相关页面共用, 这些页面显示时三栏
 * 主界面还没有挂载. 宽松档的上下内边距让页面比内容区高时卡片不会盖住右上角的控件; 带打印套件的
 * 页面在打印时只留套件.
 * @param props 组件属性.
 * @returns 外框元素.
 */
export function GateFrame(props: GateFrameProps): React.JSX.Element {
  const spacing = props.spacing ?? DEFAULT_GATE_FRAME_LAYOUT.spacing;
  const isPrintKit = props.isPrintKit ?? DEFAULT_GATE_FRAME_LAYOUT.isPrintKit;
  return (
    <main
      className={cn(
        "relative flex min-h-full items-center justify-center bg-background text-foreground",
        GATE_FRAME_SPACING_CLASSES[spacing],
        isPrintKit && GATE_FRAME_PRINT_KIT_CLASSES,
      )}
    >
      <div className={cn("absolute end-4 top-4", isPrintKit && "print:hidden")}>
        {props.corner}
      </div>
      {props.children}
    </main>
  );
}
