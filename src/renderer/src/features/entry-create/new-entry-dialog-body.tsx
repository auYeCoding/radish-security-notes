import { CustomTypeForm } from "./custom-type-form";
import { EntryTypeGrid } from "./entry-type-grid";
import { NewEntryForm } from "./new-entry-form";
import {
  entryStepOf,
  TYPE_FORM_STEP,
  TYPES_STEP,
  type NewEntryStep,
} from "./new-entry-step";

/**
 * 对话框内容的属性.
 */
interface NewEntryDialogBodyProps {
  /**
   * 对话框当前所处的步骤.
   */
  readonly step: NewEntryStep;
  /**
   * 切换步骤的回调.
   */
  readonly onStepChange: (step: NewEntryStep) => void;
  /**
   * 新建条目成功后的回调, 例如关闭对话框.
   */
  readonly onCreated: () => void;
}

/**
 * 新建条目对话框按步骤给出的内容: 选择类型时是类型网格 (含 "新建类型" 格), 新建类型时是类型表单,
 * 类型表单保存成功后直接进入用新类型新建条目的表单, 填写条目时是该类型的新建表单, 各步骤的返回
 * 都回到类型选择.
 * @param props 组件属性.
 * @returns 对话框内容元素.
 */
export function NewEntryDialogBody(
  props: NewEntryDialogBodyProps,
): React.JSX.Element {
  const { step, onStepChange } = props;
  switch (step.name) {
    case "types":
      return (
        <EntryTypeGrid
          onSelect={(type) => onStepChange(entryStepOf(type))}
          onCreateType={() => onStepChange(TYPE_FORM_STEP)}
        />
      );
    case "typeForm":
      return (
        <CustomTypeForm
          onBack={() => onStepChange(TYPES_STEP)}
          onCreated={(type) => onStepChange(entryStepOf(type))}
        />
      );
    default:
      return (
        <NewEntryForm
          type={step.type}
          onBack={() => onStepChange(TYPES_STEP)}
          onCreated={props.onCreated}
        />
      );
  }
}
