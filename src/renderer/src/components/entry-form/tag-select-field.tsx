import { useId, useMemo, useRef, type RefObject } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import type { TagSummary } from "@shared/tags/tag-types";

import { TagColorDot } from "@renderer/components/tag-color-dot";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@renderer/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@renderer/components/ui/field";

import { describeEntryFormError } from "./entry-form-errors";

/**
 * 条目表单里 "标签" 字段的属性.
 */
interface TagSelectFieldProps {
  /**
   * 可选的全部标签, 按传入的顺序显示, 由调用方按名称排序规则排好.
   */
  readonly tags: readonly TagSummary[];
}

/**
 * 标签多选下拉的属性.
 */
interface TagSelectControlProps {
  /**
   * 可选的全部标签.
   */
  readonly tags: readonly TagSummary[];
  /**
   * 已选标签编号, 按选择顺序排列.
   */
  readonly tagIds: readonly string[];
  /**
   * 选择变化时的回调, 参数是新的已选标签编号.
   */
  readonly onChange: (tagIds: string[]) => void;
  /**
   * 给输入框命名的元素编号, 是字段标签文字的编号.
   */
  readonly labelledBy: string;
}

/**
 * 已选徽章与输入框的属性.
 */
interface SelectedTagChipsProps {
  /**
   * 给输入框命名的元素编号, 是字段标签文字的编号.
   */
  readonly labelledBy: string;
}

/**
 * 多选下拉浮层的属性.
 */
interface TagOptionsProps {
  /**
   * 浮层的定位锚点, 是放徽章的容器.
   */
  readonly anchor: RefObject<HTMLDivElement | null>;
  /**
   * 已选的标签.
   */
  readonly selected: readonly TagSummary[];
}

/**
 * 取出已选编号对应的标签, 按选择顺序排列, 已不存在的标签被丢弃.
 * @param tags 全部标签.
 * @param tagIds 已选标签编号.
 * @returns 已选的标签.
 */
function pickSelectedTags(
  tags: readonly TagSummary[],
  tagIds: readonly string[],
): TagSummary[] {
  return tagIds.flatMap((tagId) => tags.find((tag) => tag.id === tagId) ?? []);
}

/**
 * 多选下拉里已选的徽章与其后的输入框: 每个徽章带颜色点与移除按钮, 一个都没选时输入框显示占位文字.
 * @param props 组件属性, 含给输入框命名的元素编号.
 * @returns 徽章与输入框元素.
 */
function SelectedTagChips(props: SelectedTagChipsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <ComboboxValue>
      {(values: TagSummary[]) => (
        <>
          {values.map((tag) => (
            <ComboboxChip
              key={tag.id}
              removeLabel={t("entryForm.tagRemove", { name: tag.name })}
            >
              <TagColorDot color={tag.color} />
              {tag.name}
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            aria-labelledby={props.labelledBy}
            placeholder={
              values.length > 0 ? "" : t("entryForm.tagsPlaceholder")
            }
          />
        </>
      )}
    </ComboboxValue>
  );
}

/**
 * 多选下拉的浮层: 没有匹配的标签时显示提示, 选中的标签数达到上限后其余选项禁用.
 * @param props 组件属性, 含浮层的定位锚点与已选标签.
 * @returns 浮层元素.
 */
function TagOptions(props: TagOptionsProps): React.JSX.Element {
  const { t } = useTranslation();
  const isAtLimit = props.selected.length >= MAX_TAGS_PER_ENTRY;
  return (
    <ComboboxContent anchor={props.anchor}>
      <ComboboxEmpty>{t("entryForm.tagsNoMatches")}</ComboboxEmpty>
      <ComboboxList>
        {(tag: TagSummary) => (
          <ComboboxItem
            key={tag.id}
            value={tag}
            disabled={
              isAtLimit && !props.selected.some((own) => own.id === tag.id)
            }
          >
            <TagColorDot color={tag.color} />
            <span className="truncate">{tag.name}</span>
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  );
}

/**
 * 标签多选下拉本体: 已选的标签显示为带颜色点的可移除徽章, 输入文字过滤已有标签.
 * @param props 组件属性.
 * @returns 多选下拉元素.
 */
function TagSelectControl(props: TagSelectControlProps): React.JSX.Element {
  const anchor = useRef<HTMLDivElement | null>(null);
  const items = useMemo(() => [...props.tags], [props.tags]);
  const selected = pickSelectedTags(items, props.tagIds);
  return (
    <Combobox
      multiple
      items={items}
      value={selected}
      itemToStringLabel={(tag: TagSummary) => tag.name}
      itemToStringValue={(tag: TagSummary) => tag.id}
      isItemEqualToValue={(first: TagSummary, second: TagSummary) =>
        first.id === second.id
      }
      onValueChange={(next: TagSummary[]) =>
        props.onChange(next.map((tag) => tag.id))
      }
    >
      <ComboboxChips ref={anchor}>
        <SelectedTagChips labelledBy={props.labelledBy} />
      </ComboboxChips>
      <TagOptions anchor={anchor} selected={selected} />
    </Combobox>
  );
}

/**
 * 条目表单里的 "标签" 字段: 标签文字, 多选下拉, 没有任何标签时提示先到设置里新建, 以及校验错误.
 * 新建与编辑共用, 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 标签字段元素.
 */
export function TagSelectField(props: TagSelectFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<NewEntryFormValues>();
  const labelIdentifier = useId();
  return (
    <Controller
      control={control}
      name="tagIds"
      render={({ field, fieldState }) => {
        const error = describeEntryFormError(fieldState.error?.message, t);
        return (
          <Field data-invalid={error !== undefined}>
            <FieldLabel id={labelIdentifier}>
              {t("entryForm.tagsLabel")}
            </FieldLabel>
            <TagSelectControl
              tags={props.tags}
              tagIds={field.value ?? []}
              onChange={field.onChange}
              labelledBy={labelIdentifier}
            />
            {props.tags.length === 0 && (
              <FieldDescription>{t("entryForm.tagsEmpty")}</FieldDescription>
            )}
            <FieldError>{error}</FieldError>
          </Field>
        );
      }}
    />
  );
}
