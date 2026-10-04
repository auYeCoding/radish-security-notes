import { describe, expect, it } from "vitest";

import {
  canOpenAttachment,
  canPreviewAttachment,
  classifyAttachment,
  previewMimeType,
  readExtension,
} from "./attachment-kind";
import { MAX_PREVIEW_BYTES } from "./attachment-limits";

describe("readExtension", () => {
  it("取最后一个点之后的小写部分", () => {
    expect(readExtension("Report.Final.PDF")).toBe("pdf");
    expect(readExtension("证书-密钥(测试).pem")).toBe("pem");
  });

  it("没有扩展名或只是隐藏文件名时为空串", () => {
    expect(readExtension("README")).toBe("");
    expect(readExtension(".gitignore")).toBe("");
    expect(readExtension("")).toBe("");
  });

  it("忽略名称末尾的点与空格, Windows 解析时也会忽略它们", () => {
    expect(readExtension("setup.exe.")).toBe("exe");
    expect(readExtension("setup.exe . ")).toBe("exe");
  });
});

describe("classifyAttachment", () => {
  it("图片扩展名是 image, 不区分大小写", () => {
    ["a.png", "a.JPG", "a.jpeg", "a.gif", "a.webp", "a.bmp"].forEach((name) =>
      expect(classifyAttachment(name)).toBe("image"),
    );
  });

  it("svg 不是可预览的图片", () => {
    expect(classifyAttachment("logo.svg")).toBe("other");
  });

  it("系统会直接运行的扩展名是 executable", () => {
    [
      "a.exe",
      "a.BAT",
      "a.cmd",
      "a.com",
      "a.msi",
      "a.scr",
      "a.ps1",
      "a.vbs",
      "a.vbe",
      "a.js",
      "a.jse",
      "a.wsf",
      "a.hta",
      "a.lnk",
      "a.jar",
      "a.reg",
      "a.url",
      "a.exe.",
    ].forEach((name) => expect(classifyAttachment(name)).toBe("executable"));
  });

  it("其它文件与原型链上的属性名都是 other", () => {
    [
      "a.pem",
      "a.txt",
      "a",
      "a.constructor",
      "a.toString",
      "a.__proto__",
    ].forEach((name) => expect(classifyAttachment(name)).toBe("other"));
  });
});

describe("canOpenAttachment", () => {
  it("可执行类不能用默认程序打开, 其它可以", () => {
    expect(canOpenAttachment("a.exe")).toBe(false);
    expect(canOpenAttachment("a.png")).toBe(true);
    expect(canOpenAttachment("a.pdf")).toBe(true);
  });
});

describe("previewMimeType", () => {
  it("可预览的图片有 MIME 类型, 其它为 undefined", () => {
    expect(previewMimeType("a.PNG")).toBe("image/png");
    expect(previewMimeType("a.jpg")).toBe("image/jpeg");
    expect(previewMimeType("a.jpeg")).toBe("image/jpeg");
    expect(previewMimeType("a.gif")).toBe("image/gif");
    expect(previewMimeType("a.webp")).toBe("image/webp");
    expect(previewMimeType("a.bmp")).toBe("image/bmp");
    expect(previewMimeType("a.svg")).toBeUndefined();
    expect(previewMimeType("a.txt")).toBeUndefined();
  });
});

describe("canPreviewAttachment", () => {
  it("可预览的图片恰好等于预览上限时能预览, 超过一个字节不能", () => {
    expect(canPreviewAttachment("a.png", MAX_PREVIEW_BYTES)).toBe(true);
    expect(canPreviewAttachment("a.png", MAX_PREVIEW_BYTES + 1)).toBe(false);
  });

  it("不是可预览图片的附件不能预览", () => {
    expect(canPreviewAttachment("a.txt", 1)).toBe(false);
    expect(canPreviewAttachment("a.exe", 1)).toBe(false);
  });
});
