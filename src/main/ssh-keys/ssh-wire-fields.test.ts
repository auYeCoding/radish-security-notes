import { describe, expect, it } from "vitest";

import { asciiBytes, encodeSshWireFields } from "../testing/ssh-wire-fixture";
import { readSshWireFields } from "./ssh-wire-fields";

describe("按长度前缀切分字段", () => {
  it("空字节没有字段", () => {
    expect(readSshWireFields(Buffer.alloc(0))).toEqual([]);
  });

  it("多个字段按顺序切开, 空字段也保留", () => {
    const fields = [asciiBytes("ssh-rsa"), Buffer.alloc(0), asciiBytes("n")];
    expect(readSshWireFields(encodeSshWireFields(fields))).toEqual(fields);
  });

  it("长度前缀不完整时无法切分", () => {
    expect(readSshWireFields(Buffer.from([0, 0, 0]))).toBeUndefined();
    const complete = encodeSshWireFields([asciiBytes("a")]);
    expect(
      readSshWireFields(Buffer.concat([complete, Buffer.from([0, 1])])),
    ).toBeUndefined();
  });

  it("内容被截断时无法切分", () => {
    const complete = encodeSshWireFields([asciiBytes("abcd")]);
    expect(readSshWireFields(complete.subarray(0, 6))).toBeUndefined();
  });

  it("长度前缀远大于剩余字节时无法切分", () => {
    const hugeLength = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x61]);
    expect(readSshWireFields(hugeLength)).toBeUndefined();
  });
});
