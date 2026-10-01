import type { ReactNode } from "react";

/**
 * 整屏页面外框的属性.
 */
interface GateFrameProps {
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
 * 整屏页面的外框: 填满窗口, 内容居中, 右上角放一组控件. 引导页, 解锁页与失败页共用,
 * 这些页面显示时三栏主界面还没有挂载.
 * @param props 组件属性.
 * @returns 外框元素.
 */
export function GateFrame(props: GateFrameProps): React.JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="absolute end-4 top-4">{props.corner}</div>
      {props.children}
    </main>
  );
}
