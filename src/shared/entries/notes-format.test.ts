import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTES_FORMAT,
  NOTES_FORMATS,
  isNotesFormat,
} from "./notes-format";

describe("备注格式", () => {
  it("取值只有纯文本与 Markdown 两种, 默认是纯文本", () => {
    expect(NOTES_FORMATS).toEqual(["plain", "markdown"]);
    expect(DEFAULT_NOTES_FORMAT).toBe("plain");
  });

  it("isNotesFormat 只认集合里的取值", () => {
    expect(isNotesFormat("plain")).toBe(true);
    expect(isNotesFormat("markdown")).toBe(true);
    expect(isNotesFormat("html")).toBe(false);
    expect(isNotesFormat("Markdown")).toBe(false);
    expect(isNotesFormat("")).toBe(false);
    expect(isNotesFormat(undefined)).toBe(false);
    expect(isNotesFormat(1)).toBe(false);
  });
});
