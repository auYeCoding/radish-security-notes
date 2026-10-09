import { useTranslation } from "react-i18next";

import type { TagSummary } from "@shared/tags/tag-types";

import { TagColorDot } from "@renderer/components/tag-color-dot";
import { useSortedTags } from "@renderer/stores/use-sorted-tags";
import { useTagStore } from "@renderer/stores/use-tag-store";

import { TagRowActions } from "./tag-row-actions";

/**
 * 标签行的属性.
 */
interface SettingsTagRowProps {
  /**
   * 这一行的标签.
   */
  readonly tag: TagSummary;
}

/**
 * 设置里的一行标签: 颜色点, 名称与行尾的更多菜单. 名称太长时截断.
 * @param props 组件属性.
 * @returns 标签行元素.
 */
function SettingsTagRow(props: SettingsTagRowProps): React.JSX.Element {
  return (
    <li className="flex items-center gap-2">
      <TagColorDot color={props.tag.color} />
      <span className="min-w-0 flex-1 truncate text-sm">{props.tag.name}</span>
      <TagRowActions tag={props.tag} />
    </li>
  );
}

/**
 * 设置 "标签" 分区里的标签列表: 每个标签一行 (按名称排序规则排列), 行尾有编辑与删除的菜单. 读取失败
 * 或没有标签时在列表位置说明.
 * @returns 标签列表元素.
 */
export function SettingsTagList(): React.JSX.Element {
  const { t } = useTranslation();
  const tags = useSortedTags();
  const loadStatus = useTagStore((state) => state.loadStatus);
  return (
    <>
      {tags.length > 0 && (
        <ul className="flex flex-col gap-1">
          {tags.map((tag) => (
            <SettingsTagRow key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
      {loadStatus === "failed" && (
        <p className="text-sm text-muted-foreground">
          {t("folderPane.tagsLoadFailed")}
        </p>
      )}
      {loadStatus === "ready" && tags.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("folderPane.emptyTags")}
        </p>
      )}
    </>
  );
}
