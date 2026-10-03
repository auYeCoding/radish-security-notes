import { describe, expect, it } from "vitest";

import { NAME_CATEGORY } from "./name-category";
import { buildNameSortKey } from "./name-sort-key";
import { NAME_START_GROUP } from "./name-start";

describe("buildNameSortKey", () => {
  it("把名称拆成类别, 字符个数与开头", () => {
    expect(buildNameSortKey("微信Pay")).toEqual({
      category: NAME_CATEGORY.mixed,
      length: 5,
      start: { group: NAME_START_GROUP.letter, rank: 22, digits: "" },
    });
  });

  it("字符个数按码点算", () => {
    expect(buildNameSortKey("a😀").length).toBe(2);
  });
});
