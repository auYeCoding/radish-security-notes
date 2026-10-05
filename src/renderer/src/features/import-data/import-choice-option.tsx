import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@renderer/components/ui/field";
import { RadioGroupItem } from "@renderer/components/ui/radio-group";

/**
 * 单选卡片的属性.
 */
interface ImportChoiceOptionProps {
  /**
   * 选项的取值.
   */
  readonly value: string;
  /**
   * 单选按钮的编号, 标签用它关联按钮, 同一个单选组里不能重复.
   */
  readonly id: string;
  /**
   * 选项的标题.
   */
  readonly title: string;
  /**
   * 选项的说明, 没有时不显示.
   */
  readonly description?: string;
}

/**
 * 导入对话框里的单选卡片: 整张卡片是一个标签, 点哪里都选中, 左边是标题与说明, 右边是单选按钮.
 * 选择来源与选择重复条目处理方式共用.
 * @param props 组件属性.
 * @returns 单选卡片元素.
 */
export function ImportChoiceOption(
  props: ImportChoiceOptionProps,
): React.JSX.Element {
  return (
    <FieldLabel htmlFor={props.id}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{props.title}</FieldTitle>
          {props.description !== undefined && (
            <FieldDescription>{props.description}</FieldDescription>
          )}
        </FieldContent>
        <RadioGroupItem value={props.value} id={props.id} />
      </Field>
    </FieldLabel>
  );
}
