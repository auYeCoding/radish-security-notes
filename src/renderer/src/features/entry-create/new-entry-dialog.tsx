import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { NewEntryDialogBody } from "./new-entry-dialog-body";
import { TYPES_STEP, type NewEntryStep } from "./new-entry-step";

/**
 * 新建对话框的属性.
 */
interface NewEntryDialogProps {
  /**
   * 对话框当前是否打开.
   */
  readonly isOpen: boolean;
  /**
   * 对话框开合状态变化时的回调.
   */
  readonly onOpenChange: (isOpen: boolean) => void;
}

/**
 * 对话框标题与说明的文案.
 */
interface StepTexts {
  /**
   * 标题.
   */
  readonly title: string;
  /**
   * 说明.
   */
  readonly description: string;
}

/**
 * 取一个步骤的标题与说明.
 * @param step 对话框当前所处的步骤.
 * @param translate 翻译函数.
 * @returns 标题与说明.
 */
function textsOfStep(step: NewEntryStep, translate: TFunction): StepTexts {
  switch (step.name) {
    case "types":
      return {
        title: translate("entryCreate.typeStep.title"),
        description: translate("entryCreate.typeStep.description"),
      };
    case "typeForm":
      return {
        title: translate("entryCreate.customType.title"),
        description: translate("entryCreate.customType.description"),
      };
    default:
      return {
        title: translate("entryCreate.title"),
        description: translate("entryCreate.description"),
      };
  }
}

/**
 * 新建条目的对话框, 分步: 第一步标题是 "选择条目类型", 里面是类型网格, 点选一个类型进入填写条目,
 * 点末尾的 "新建类型" 进入新建自定义类型的表单, 保存后直接进入用新类型填写条目; 填写条目时标题是
 * "新建条目", 里面是该类型的新建表单, 表单顶部的返回按钮回到第一步并丢弃已填内容. 为容纳自定义
 * 字段, 宽度比默认对话框大一档. 关闭时回到第一步, 下次打开是类型选择.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function NewEntryDialog(props: NewEntryDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [step, setStep] = useState<NewEntryStep>(TYPES_STEP);
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setStep(TYPES_STEP);
    }
    props.onOpenChange(isOpen);
  };
  const texts = textsOfStep(step, t);
  return (
    <Dialog open={props.isOpen} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{texts.title}</DialogTitle>
          <DialogDescription>{texts.description}</DialogDescription>
        </DialogHeader>
        <NewEntryDialogBody
          step={step}
          onStepChange={setStep}
          onCreated={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
