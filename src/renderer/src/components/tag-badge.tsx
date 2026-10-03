import type { TagSummary } from "@shared/tags/tag-types";

import { TagColorDot } from "@renderer/components/tag-color-dot";
import { Badge } from "@renderer/components/ui/badge";

/**
 * 标签徽章的属性.
 */
interface TagBadgeProps {
  /**
   * 要显示的标签.
   */
  readonly tag: TagSummary;
}

/**
 * 标签徽章: 带颜色点的描边徽章, 名称过长时在徽章内省略.
 * @param props 组件属性.
 * @returns 徽章元素.
 */
export function TagBadge(props: TagBadgeProps): React.JSX.Element {
  return (
    <Badge variant="outline" className="max-w-full">
      <TagColorDot color={props.tag.color} />
      <span className="truncate">{props.tag.name}</span>
    </Badge>
  );
}
