import { expect } from "vitest";

import { findHardcodedMotion } from "./find-hardcoded-motion";

/**
 * 取出元素上的类名列表.
 * @param element 元素, 可以是没找到的 null.
 * @returns 类名列表.
 */
function readClassList(element: Element | null): string[] {
  expect(element).not.toBeNull();
  return (element?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

/**
 * 断言元素带有全部期望的动效类名 (类名合并之后仍在), 并且没有写死毫秒的时长与自定义曲线.
 * @param element 被检查的元素.
 * @param expectedClassNames 期望的类名文本, 用空格分隔.
 */
export function expectMotionClasses(
  element: Element | null,
  expectedClassNames: string,
): void {
  const classList = readClassList(element);
  expect(classList).toEqual(
    expect.arrayContaining(expectedClassNames.split(" ")),
  );
  expect(findHardcodedMotion(classList.join(" "))).toEqual([]);
}

/**
 * 断言元素上没有任何包含指定片段的类名.
 * @param element 被检查的元素.
 * @param forbiddenFragments 不允许出现在类名里的片段.
 */
export function expectNoClassContaining(
  element: Element | null,
  forbiddenFragments: readonly string[],
): void {
  const classList = readClassList(element);
  const found = classList.filter((className) =>
    forbiddenFragments.some((fragment) => className.includes(fragment)),
  );
  expect(found).toEqual([]);
}
