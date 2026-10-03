import { describe, expect, it } from "vitest";

import { operationFailed, operationSucceeded } from "./operation-result";

describe("operationSucceeded", () => {
  it("带上操作产生的值", () => {
    expect(operationSucceeded("value")).toEqual({ ok: true, value: "value" });
  });

  it("值可以是 undefined", () => {
    expect(operationSucceeded(undefined)).toEqual({
      ok: true,
      value: undefined,
    });
  });
});

describe("operationFailed", () => {
  it("带上失败原因, 不带值", () => {
    expect(operationFailed("not-found")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
