import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

/**
 * 主题与语言的组合控件: 主题切换与语言切换并排, 用在顶栏右侧与整屏页面的右上角. 设置对话框里两个
 * 切换控件分别放在各自的行里.
 * @returns 主题与语言两组分段控件.
 */
export function PreferencesSwitchers(): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeSwitcher />
      <LanguageSwitcher />
    </div>
  );
}
