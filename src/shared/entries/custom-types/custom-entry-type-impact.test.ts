import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "../../testing/custom-type-fixtures";
import {
  isUpdateConfirmationNeeded,
  measureUpdateImpact,
  type ImpactFieldInput,
} from "./custom-entry-type-impact";

/**
 * 路由器类型三个字段原样提交的字段属性.
 */
const UNCHANGED_FIELDS: readonly ImpactFieldInput[] = [
  { key: "account", isSensitive: false },
  { key: "field-pass", isSensitive: true },
  { key: "field-note", isSensitive: false },
];

describe("measureUpdateImpact", () => {
  it("原样提交时没有被删字段, 也没有保密改非保密的字段", () => {
    expect(measureUpdateImpact(ROUTER_TYPE, UNCHANGED_FIELDS)).toEqual({
      removedFields: [],
      unsensitizedFields: [],
    });
  });

  it("原有字段没有出现在提交字段里时是被删字段", () => {
    const impact = measureUpdateImpact(ROUTER_TYPE, [
      UNCHANGED_FIELDS[0],
      { isSensitive: false },
    ]);

    expect(impact.removedFields.map((field) => field.key)).toEqual([
      "field-pass",
      "field-note",
    ]);
  });

  it("带着键且不再保密的原保密字段是保密改非保密的字段", () => {
    const impact = measureUpdateImpact(ROUTER_TYPE, [
      UNCHANGED_FIELDS[0],
      { key: "field-pass", isSensitive: false },
      UNCHANGED_FIELDS[2],
    ]);

    expect(impact.unsensitizedFields.map((field) => field.key)).toEqual([
      "field-pass",
    ]);
    expect(impact.removedFields).toEqual([]);
  });

  it("非保密改保密, 以及被删除的保密字段都不算保密改非保密", () => {
    const impact = measureUpdateImpact(ROUTER_TYPE, [
      { key: "account", isSensitive: true },
      UNCHANGED_FIELDS[2],
    ]);

    expect(impact.unsensitizedFields).toEqual([]);
  });
});

describe("isUpdateConfirmationNeeded", () => {
  const removed = measureUpdateImpact(ROUTER_TYPE, [UNCHANGED_FIELDS[0]]);
  const unsensitized = measureUpdateImpact(ROUTER_TYPE, [
    UNCHANGED_FIELDS[0],
    { key: "field-pass", isSensitive: false },
    UNCHANGED_FIELDS[2],
  ]);
  const harmless = measureUpdateImpact(ROUTER_TYPE, UNCHANGED_FIELDS);

  it("有字段被删且类型下有条目时需要确认, 没有条目时不需要", () => {
    expect(isUpdateConfirmationNeeded(removed, 2)).toBe(true);
    expect(isUpdateConfirmationNeeded(removed, 0)).toBe(false);
  });

  it("有保密字段改成非保密时无论有没有条目都需要确认", () => {
    expect(isUpdateConfirmationNeeded(unsensitized, 0)).toBe(true);
    expect(isUpdateConfirmationNeeded(unsensitized, 3)).toBe(true);
  });

  it("没有影响时不需要确认", () => {
    expect(isUpdateConfirmationNeeded(harmless, 5)).toBe(false);
  });
});
