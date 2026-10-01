import type {
  ResolvedTheme,
  ThemeSource,
} from "@shared/preferences/theme-source";

import type { NativeThemePort } from "./native-theme-port";

/**
 * 主题控制器: 以系统主题为状态源, 应用主题来源并报告解析后的明暗主题.
 */
export class ThemeController {
  /**
   * 创建主题控制器.
   * @param nativeTheme 系统主题接口.
   */
  constructor(private readonly nativeTheme: NativeThemePort) {}

  /**
   * 应用主题来源, 写入系统主题.
   * @param themeSource 要应用的主题来源.
   */
  apply(themeSource: ThemeSource): void {
    this.nativeTheme.themeSource = themeSource;
  }

  /**
   * 读取解析后实际生效的明暗主题.
   * @returns 深色外观时为 dark, 否则为 light.
   */
  getResolvedTheme(): ResolvedTheme {
    return this.nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }

  /**
   * 订阅解析后明暗主题的变化.
   * @param listener 变化时的回调, 参数为新的明暗主题.
   */
  onResolvedThemeChanged(
    listener: (resolvedTheme: ResolvedTheme) => void,
  ): void {
    this.nativeTheme.on("updated", () => listener(this.getResolvedTheme()));
  }
}
