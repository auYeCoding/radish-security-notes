import type { ReactNode } from "react";

import { cn } from "@renderer/lib/class-names";

/**
 * 外框上下内边距的档位: 默认与改动前一致, 宽松档给页面比窗口高时留出余地.
 */
export type GateFrameSpacing = "default" | "roomy";

/**
 * 整屏页面外框的版式.
 */
export interface GateFrameLayout {
  /**
   * 上下内边距的档位.
   */
  readonly spacing: GateFrameSpacing;
  /**
   * 页面是否带打印套件: 为真时打印取消最小高度与内边距, 右上角控件隐藏, 避免纸上多出空白页.
   */
  readonly isPrintKit: boolean;
}

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
 * 整屏页面的外框: 填满窗口, 内容居中, 右上角放一组控件. 引导页, 解锁页, 失败页与恢复相关
 * 页面共用, 这些页面显示时三栏主界面还没有挂载. 宽松档的上下内边距让页面比窗口高时卡片不会
 * 盖住右上角的控件; 带打印套件的页面在打印时只留套件.
 * @param props 组件属性.
 * @returns 外框元素.
 */
export function GateFrame(props: GateFrameProps): React.JSX.Element {
  const isPrintKit = props.isPrintKit ?? false;
  return (
    <main
      className={cn(
        "relative flex min-h-screen items-center justify-center bg-background text-foreground",
        GATE_FRAME_SPACING_CLASSES[props.spacing ?? "default"],
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
