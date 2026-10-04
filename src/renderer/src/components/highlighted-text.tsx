import { Fragment } from "react";

import type { TextRange } from "@shared/search/find-term-ranges";
import { splitByRanges } from "@shared/search/highlight-ranges";

/**
 * 高亮文本的属性.
 */
interface HighlightedTextProps {
  /**
   * 要显示的原文.
   */
  readonly text: string;
  /**
   * 原文里要高亮的区间, 已排序且互不重叠; 为空时原文原样显示.
   */
  readonly ranges: readonly TextRange[];
}

/**
 * 高亮文本: 按给定区间把命中处包进 `mark` 元素, 其余原样显示, 命中处用品牌色的浅底色标出,
 * 文字颜色不变. 没有区间时只输出原文, 不多包一层元素.
 * @param props 组件属性.
 * @returns 高亮后的文本片段.
 */
export function HighlightedText(
  props: HighlightedTextProps,
): React.JSX.Element {
  if (props.ranges.length === 0) {
    return <>{props.text}</>;
  }
  return (
    <>
      {splitByRanges(props.text, props.ranges).map((segment, index) =>
        segment.isMatch ? (
          <mark key={index} className="rounded-sm bg-brand/20 text-inherit">
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
