import { useId } from "react";

/**
 * 设置分区的属性.
 */
interface SettingsSectionProps {
  /**
   * 分区标题, 由调用方按当前语言提供.
   */
  readonly title: string;
  /**
   * 分区里纵向排列的设置行.
   */
  readonly children: React.ReactNode;
}

/**
 * 设置分区的外壳: 一个带标题的区域, 标题之下纵向排列各设置行. 区域以标题命名, 读屏软件能按分区
 * 跳转.
 * @param props 组件属性.
 * @returns 设置分区元素.
 */
export function SettingsSection(
  props: SettingsSectionProps,
): React.JSX.Element {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold">
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}
