/**
 * 深色外观时设置在 html 元素上的类名, 与 Shadcn 的暗色变体约定一致.
 */
export const DARK_CLASS_NAME = "dark";

/**
 * 判断系统是否处于深色外观的媒体查询. Electron 的 `nativeTheme.themeSource`
 * 会同步改变渲染进程里该查询的结果, 所以它跟随主进程的主题状态.
 */
export const DARK_COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * 跟随外观的媒体查询所需的最小接口.
 */
export type DarkSchemeSource = Pick<
  MediaQueryList,
  "matches" | "addEventListener" | "removeEventListener"
>;

/**
 * 让根元素的深色类名跟随系统外观: 立即同步一次, 之后随外观变化更新.
 * @param root 要设置类名的根元素, 通常是 html.
 * @param darkSchemeSource 深色外观的媒体查询.
 * @returns 取消跟随的函数.
 */
export function followSystemTheme(
  root: Element,
  darkSchemeSource: DarkSchemeSource,
): () => void {
  const applyDarkClass = (isDark: boolean): void => {
    root.classList.toggle(DARK_CLASS_NAME, isDark);
  };
  const handleChange = (event: MediaQueryListEvent): void => {
    applyDarkClass(event.matches);
  };
  applyDarkClass(darkSchemeSource.matches);
  darkSchemeSource.addEventListener("change", handleChange);
  return () => darkSchemeSource.removeEventListener("change", handleChange);
}
