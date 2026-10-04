import { afterEach, describe, expect, it } from "vitest";

import { installFileDropGuard } from "./file-drop-guard";

/**
 * 在文档上派发一个带给定拖动内容类型的拖放事件.
 * @param type 事件类型.
 * @param types 拖动内容里的类型名.
 * @returns 派发后的事件.
 */
function dispatchDrag(type: "dragover" | "drop", types: string[]): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { types, dropEffect: "copy" },
  });
  document.body.dispatchEvent(event);
  return event as DragEvent;
}

describe("installFileDropGuard", () => {
  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
  });

  it("带文件的拖动悬在页面上时被阻止, 并标明不可放下", () => {
    uninstall = installFileDropGuard(document);

    const event = dispatchDrag("dragover", ["Files"]);

    expect(event.defaultPrevented).toBe(true);
    expect(event.dataTransfer?.dropEffect).toBe("none");
  });

  it("带文件的放下被阻止, 页面不会被导航到被拖的文件", () => {
    uninstall = installFileDropGuard(document);

    expect(dispatchDrag("drop", ["Files"]).defaultPrevented).toBe(true);
  });

  it("不带文件的拖动 (例如拖条目) 不受影响", () => {
    uninstall = installFileDropGuard(document);

    const over = dispatchDrag("dragover", ["text/plain"]);
    const drop = dispatchDrag("drop", ["text/plain"]);

    expect(over.defaultPrevented).toBe(false);
    expect(drop.defaultPrevented).toBe(false);
  });

  it("卸载之后不再阻止", () => {
    installFileDropGuard(document)();

    expect(dispatchDrag("drop", ["Files"]).defaultPrevented).toBe(false);
  });
});

describe("installFileDropGuard 与已处理的拖放", () => {
  it("附件区已经阻止默认行为的事件不再被改成不可放下", () => {
    const uninstall = installFileDropGuard(document);
    const handled = (event: Event): void => event.preventDefault();
    document.body.addEventListener("dragover", handled);

    const event = dispatchDrag("dragover", ["Files"]);

    document.body.removeEventListener("dragover", handled);
    uninstall();
    expect(event.dataTransfer?.dropEffect).toBe("copy");
  });
});
