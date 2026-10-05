import { describe, expect, it } from "vitest";

import {
  describeExportFormat,
  ENCRYPTED_FILE_EXTENSION,
  exportFileExtension,
} from "./export-format-capabilities";
import { EXPORT_FORMAT_KEYS } from "./export-format-keys";
import { EXPORT_LOSS_REASONS } from "./export-loss-reasons";

describe("导出格式的能力", () => {
  it("每个格式键都登记了能力, 扩展名非空", () => {
    for (const key of EXPORT_FORMAT_KEYS) {
      const capability = describeExportFormat(key);
      expect(capability.key).toBe(key);
      expect(capability.fileExtension.length).toBeGreaterThan(0);
    }
  });

  it("只有本应用格式能带附件, 且它没有带不出的内容", () => {
    expect(describeExportFormat("native").canCarryAttachments).toBe(true);
    expect(describeExportFormat("native").excludedContent).toEqual([]);
    expect(describeExportFormat("bitwardenJson").canCarryAttachments).toBe(
      false,
    );
    expect(describeExportFormat("browserCsv").canCarryAttachments).toBe(false);
  });

  it("不能带附件的格式把附件列为带不出的内容", () => {
    for (const key of EXPORT_FORMAT_KEYS) {
      const capability = describeExportFormat(key);
      expect(capability.excludedContent.includes("attachments")).toBe(
        !capability.canCarryAttachments,
      );
    }
  });

  it("带不出的原因都是登记过的原因, 同一格式里不重复", () => {
    for (const key of EXPORT_FORMAT_KEYS) {
      const { excludedContent } = describeExportFormat(key);
      expect(new Set(excludedContent).size).toBe(excludedContent.length);
      for (const reason of excludedContent) {
        expect(EXPORT_LOSS_REASONS.includes(reason)).toBe(true);
      }
    }
  });

  it("扩展名: 未加密用格式自己的, 加密时追加 age", () => {
    expect(ENCRYPTED_FILE_EXTENSION).toBe("age");
    expect(exportFileExtension("native", false)).toBe("zip");
    expect(exportFileExtension("native", true)).toBe("zip.age");
    expect(exportFileExtension("bitwardenJson", false)).toBe("json");
    expect(exportFileExtension("bitwardenJson", true)).toBe("json.age");
    expect(exportFileExtension("browserCsv", false)).toBe("csv");
    expect(exportFileExtension("browserCsv", true)).toBe("csv.age");
  });
});
