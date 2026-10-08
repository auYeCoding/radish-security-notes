/**
 * 页面发起的一次导航或重定向.
 */
export interface NavigationRequest {
  /**
   * 导航的目标地址.
   */
  readonly url: string;
  /**
   * 导航是否发生在主框架里, 子框架里的导航为 false.
   */
  readonly isMainFrame: boolean;
}

/**
 * 判断页面发起的导航或重定向能不能放行: 只放行主框架对当前页面地址的重载, 其余一律不放行, 窗口
 * 不会离开应用的页面, 子框架也不能导航.
 * @param request 这次导航或重定向.
 * @param currentUrl 页面当前的地址.
 * @returns 可以放行时为 true.
 */
export function isNavigationAllowed(
  request: NavigationRequest,
  currentUrl: string,
): boolean {
  return request.isMainFrame && request.url === currentUrl;
}
