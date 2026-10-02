import { ImageIcon } from "lucide-react";
import { useRef } from "react";

import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";

/**
 * 选择图片按钮的属性.
 */
interface ImagePickButtonProps {
  /**
   * 按钮上的文字, 也是隐藏的文件输入框的无障碍名称.
   */
  readonly label: string;
  /**
   * 选中一张图片后的回调.
   */
  readonly onPick: (image: File) => void;
  /**
   * 是否禁用按钮, 例如上一张图片还在处理.
   */
  readonly isDisabled?: boolean;
}

/**
 * 选择图片按钮: 点击后打开系统的选择文件窗口, 只列出图片. 选中后回调所选文件, 并清空文件输入
 * 框, 让同一张图片可以再次选择.
 * @param props 组件属性.
 * @returns 按钮与隐藏的文件输入框.
 */
export function ImagePickButton(
  props: ImagePickButtonProps,
): React.JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const [image] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (image !== undefined) {
      props.onPick(image);
    }
  };
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={props.isDisabled}
        onClick={() => fileInput.current?.click()}
      >
        <ImageIcon aria-hidden="true" />
        {props.label}
      </Button>
      <Input
        ref={fileInput}
        type="file"
        accept="image/*"
        aria-label={props.label}
        className="hidden"
        tabIndex={-1}
        onChange={handleChange}
      />
    </>
  );
}
