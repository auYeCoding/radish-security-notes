import { splitRecoveryText } from "@shared/vault/recovery-words";

/**
 * 把粘贴的一整段文字分发到各个输入框. 粘贴的内容只有一个词时不处理, 交给输入框自己的粘贴;
 * 粘贴的词数不少于输入框个数时从第一个框开始填, 否则从当前框开始往后填, 超出的词丢弃.
 * @param current 各输入框当前的内容.
 * @param startIndex 粘贴发生的输入框下标 (从 0 起).
 * @param pastedText 粘贴的文字.
 * @returns 分发后各输入框的内容, 不需要分发时为 undefined.
 */
export function distributePastedWords(
  current: readonly string[],
  startIndex: number,
  pastedText: string,
): string[] | undefined {
  const pastedWords = splitRecoveryText(pastedText);
  if (pastedWords.length < 2) {
    return undefined;
  }
  const firstIndex = pastedWords.length >= current.length ? 0 : startIndex;
  const distributed = [...current];
  pastedWords.slice(0, current.length - firstIndex).forEach((word, offset) => {
    distributed[firstIndex + offset] = word;
  });
  return distributed;
}
