import { useTranslation } from "react-i18next";

import { Skeleton } from "@renderer/components/ui/skeleton";
import { FADE_IN_MOTION } from "@renderer/components/ui/state-motion";
import { cn } from "@renderer/lib/class-names";

/**
 * 骨架里各字段值占位块的宽度类名, 长短错开, 一项对应一行字段.
 */
const FIELD_VALUE_WIDTH_CLASS_NAMES = ["w-56", "w-32", "w-64", "w-40"] as const;

/**
 * 条目详情读取期间的骨架: 按详情的版式摆出类型, 名称, 文件夹与几行字段的占位块, 间距与详情视图
 * 一致, 读取完成后内容原位替换. 占位块本身对读屏软件隐藏, 整体以状态区域通知正在读取.
 * @returns 骨架元素.
 */
export function EntryDetailSkeleton(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t("entryDetailPane.loading")}
      className={cn(FADE_IN_MOTION, "flex flex-col gap-6 p-8")}
    >
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-4">
        {FIELD_VALUE_WIDTH_CLASS_NAMES.map((widthClassName) => (
          <div key={widthClassName} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className={cn("h-6", widthClassName)} />
          </div>
        ))}
      </div>
    </div>
  );
}
