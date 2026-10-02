import { useState } from "react";

import { RestoreProtectionStep } from "./restore-protection-step";
import { RestoreWordsStep } from "./restore-words-step";

/**
 * 凭恢复词恢复的页面, 分两步: 先输入并校验 24 个词, 再设置新主密码或改用系统保护. 词只在
 * 这两步期间保存在本组件里, 离开页面或恢复成功后随组件卸载丢弃.
 * @returns 恢复页元素.
 */
export function RestoreScreen(): React.JSX.Element {
  const [verifiedWords, setVerifiedWords] = useState<
    readonly string[] | undefined
  >(undefined);
  if (verifiedWords === undefined) {
    return <RestoreWordsStep onVerified={setVerifiedWords} />;
  }
  return <RestoreProtectionStep words={verifiedWords} />;
}
