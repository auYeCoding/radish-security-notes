import { describe, expect, it } from "vitest";

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTRY,
  MAX_ENTRY_ATTACHMENT_BYTES,
  findCapacityViolation,
  findFileViolation,
} from "./attachment-limits";

describe("findFileViolation", () => {
  it("合规的文件没有违规, 恰好等于上限也合规", () => {
    expect(
      findFileViolation([
        { name: "a.txt", size: 1 },
        { name: "b.bin", size: MAX_ATTACHMENT_BYTES },
      ]),
    ).toBeUndefined();
    expect(findFileViolation([])).toBeUndefined();
  });

  it("0 字节的文件是空文件, 带文件名", () => {
    expect(findFileViolation([{ name: "空.txt", size: 0 }])).toEqual({
      reason: "empty-file",
      fileName: "空.txt",
    });
  });

  it("超过单个上限一个字节就是过大", () => {
    expect(
      findFileViolation([{ name: "big.bin", size: MAX_ATTACHMENT_BYTES + 1 }]),
    ).toEqual({ reason: "file-too-large", fileName: "big.bin" });
  });

  it("只报按顺序出现的第一个不合规文件", () => {
    expect(
      findFileViolation([
        { name: "ok.txt", size: 5 },
        { name: "first-empty.txt", size: 0 },
        { name: "second-big.bin", size: MAX_ATTACHMENT_BYTES + 1 },
      ]),
    ).toEqual({ reason: "empty-file", fileName: "first-empty.txt" });
  });
});

describe("findCapacityViolation", () => {
  const files = [{ name: "a.txt", size: 10 }];

  it("加上新文件后恰好等于个数与总大小上限时不算超限", () => {
    const fullCount = Array.from(
      { length: MAX_ATTACHMENTS_PER_ENTRY },
      (_, index) => ({ name: `f-${index}`, size: 1 }),
    );

    expect(
      findCapacityViolation({ count: 0, totalBytes: 0 }, fullCount),
    ).toBeUndefined();
    expect(
      findCapacityViolation(
        { count: 1, totalBytes: MAX_ENTRY_ATTACHMENT_BYTES - 10 },
        files,
      ),
    ).toBeUndefined();
  });

  it("个数超过上限是 too-many-attachments", () => {
    expect(
      findCapacityViolation(
        { count: MAX_ATTACHMENTS_PER_ENTRY, totalBytes: 0 },
        files,
      ),
    ).toBe("too-many-attachments");
  });

  it("总大小超过上限是 total-too-large", () => {
    expect(
      findCapacityViolation(
        { count: 1, totalBytes: MAX_ENTRY_ATTACHMENT_BYTES - 9 },
        files,
      ),
    ).toBe("total-too-large");
  });

  it("个数与总大小都超限时先报个数", () => {
    expect(
      findCapacityViolation(
        {
          count: MAX_ATTACHMENTS_PER_ENTRY,
          totalBytes: MAX_ENTRY_ATTACHMENT_BYTES,
        },
        files,
      ),
    ).toBe("too-many-attachments");
  });
});
