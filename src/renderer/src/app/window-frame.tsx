import type { ReactNode } from "react";

import { TitleBar } from "@renderer/components/title-bar";
import { ConnectedWindowControls } from "@renderer/features/window-controls/connected-window-controls";

import { AppBrand } from "./app-brand";

/**
 * 窗口框架的属性.
 */
interface WindowFrameProps {
  /**
   * 标题栏下方的全部界面.
   */
  readonly children: ReactNode;
}

/**
 * 窗口框架: 纵向排布, 顶部是标题栏 (左侧应用名称, 右侧窗口按钮), 其下的内容容器占满剩余高度, 内容
 * 比窗口高时只有内容容器滚动, 标题栏始终在顶部. 所有界面共用这一个标题栏实例, 切换界面不重建它.
 * 打印时标题栏隐藏, 框架不限制高度也不裁剪内容.
 * @param props 组件属性.
 * @returns 窗口框架元素.
 */
export function WindowFrame(props: WindowFrameProps): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col print:block print:h-auto">
      <TitleBar leading={<AppBrand />} trailing={<ConnectedWindowControls />} />
      <div
        data-slot="window-content"
        className="min-h-0 flex-1 overflow-y-auto print:overflow-visible"
      >
        {props.children}
      </div>
    </div>
  );
}
