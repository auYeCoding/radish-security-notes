/**
 * 链接桥: 渲染进程请主进程用系统默认程序打开外部链接. 地址在主进程里按外部链接策略再校验一次,
 * 渲染进程不能借此打开任意地址.
 */
export interface LinkBridge {
  /**
   * 用系统默认程序打开一个外部链接.
   * @param url 要打开的地址.
   * @returns 地址符合外部链接策略并已交给系统时为 true, 否则为 false.
   */
  readonly openExternal: (url: string) => Promise<boolean>;
}
