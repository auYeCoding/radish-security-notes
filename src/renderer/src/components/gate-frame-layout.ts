/**
 * 外框上下内边距的档位: 默认与恢复功能加入之前一致, 宽松档给页面比窗口高时留出余地.
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
 * 默认版式, 与恢复功能加入之前的整屏页面一致. 外框没有收到版式属性时用它, 引导页, 解锁页与
 * 失败页也用它, 其它版式只写与它不同的字段. 默认值只在这里定义一次.
 */
export const DEFAULT_GATE_FRAME_LAYOUT: GateFrameLayout = {
  spacing: "default",
  isPrintKit: false,
};
