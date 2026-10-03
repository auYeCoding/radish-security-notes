import { useTranslation } from "react-i18next";

import {
  TAG_COLOR_KEYS,
  isTagColorKey,
  type TagColorKey,
} from "@shared/tags/tag-colors";

import { TagColorDot } from "@renderer/components/tag-color-dot";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@renderer/components/ui/toggle-group";

/**
 * 调色板的属性.
 */
interface TagColorPickerProps {
  /**
   * 当前选中的颜色键.
   */
  readonly value: TagColorKey;
  /**
   * 选中新颜色时的回调. 重复点击已选中的颜色不会触发.
   */
  readonly onChange: (color: TagColorKey) => void;
  /**
   * 给调色板分组命名的元素编号, 通常是旁边标签文字的编号.
   */
  readonly labelledBy: string;
}

/**
 * 标签调色板: 一行相连的颜色点按钮, 单选, 每个按钮的无障碍名称是颜色名称, 选中项用底色标出.
 * @param props 组件属性.
 * @returns 调色板元素.
 */
export function TagColorPicker(props: TagColorPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <ToggleGroup
      aria-labelledby={props.labelledBy}
      className="flex-wrap"
      spacing={1}
      value={[props.value]}
      variant="outline"
      onValueChange={(groupValue) => {
        const [selected] = groupValue;
        if (isTagColorKey(selected)) {
          props.onChange(selected);
        }
      }}
    >
      {TAG_COLOR_KEYS.map((color) => (
        <ToggleGroupItem
          key={color}
          aria-label={t(`tagColors.${color}`)}
          className="aria-pressed:bg-accent aria-pressed:ring-1 aria-pressed:ring-brand"
          value={color}
        >
          <TagColorDot color={color} className="size-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
