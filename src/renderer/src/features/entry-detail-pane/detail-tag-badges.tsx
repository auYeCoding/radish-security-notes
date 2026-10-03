import { useTranslation } from "react-i18next";

import { TagBadge } from "@renderer/components/tag-badge";
import { useTagStore } from "@renderer/stores/use-tag-store";

/**
 * 详情标签行的属性.
 */
interface DetailTagBadgesProps {
  /**
   * 条目带的标签编号, 按选择顺序排列, 没有标签时为 undefined.
   */
  readonly tagIds: readonly string[] | undefined;
}

/**
 * 详情标题下列出条目带的标签: 每个标签一个带颜色点的徽章, 按条目上的选择顺序排列, 条目没有标签时
 * 不显示这一行.
 * @param props 组件属性.
 * @returns 标签行元素, 没有标签时为空.
 */
export function DetailTagBadges(
  props: DetailTagBadgesProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const tags = useTagStore((state) => state.tags);
  const own = (props.tagIds ?? []).flatMap(
    (tagId) => tags.find((tag) => tag.id === tagId) ?? [],
  );
  if (own.length === 0) {
    return null;
  }
  return (
    <ul
      aria-label={t("entryDetail.tags")}
      className="flex flex-wrap gap-1.5 pt-1"
    >
      {own.map((tag) => (
        <li key={tag.id} className="max-w-full">
          <TagBadge tag={tag} />
        </li>
      ))}
    </ul>
  );
}
