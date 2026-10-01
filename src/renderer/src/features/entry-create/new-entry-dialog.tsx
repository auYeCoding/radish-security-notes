import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { EntryTypeGrid } from "./entry-type-grid";
import { NewEntryForm } from "./new-entry-form";

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
 * 新建条目的对话框, 分两步: 第一步标题是 "选择条目类型", 里面是类型网格, 点选一个类型进入
 * 第二步; 第二步标题是 "新建条目", 里面是该类型的新建表单, 表单顶部的返回按钮回到第一步并
 * 丢弃已填内容. 为容纳自定义字段, 宽度比默认对话框大一档. 关闭时回到第一步, 下次打开是类型
 * 选择.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function NewEntryDialog(props: NewEntryDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<
    PresetEntryTypeDefinition | undefined
  >(undefined);
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setSelectedType(undefined);
    }
    props.onOpenChange(isOpen);
  };
  const step = selectedType === undefined ? "typeStep" : "form";
  return (
    <Dialog open={props.isOpen} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "typeStep"
              ? t("entryCreate.typeStep.title")
              : t("entryCreate.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "typeStep"
              ? t("entryCreate.typeStep.description")
              : t("entryCreate.description")}
          </DialogDescription>
        </DialogHeader>
        {selectedType === undefined ? (
          <EntryTypeGrid onSelect={setSelectedType} />
        ) : (
          <NewEntryForm
            type={selectedType}
            onBack={() => setSelectedType(undefined)}
            onCreated={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
