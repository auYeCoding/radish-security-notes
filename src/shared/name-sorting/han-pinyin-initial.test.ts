import { describe, expect, it } from "vitest";

import { pinyinInitialOf } from "./han-pinyin-initial";

describe("pinyinInitialOf 的 23 个首字母", () => {
  it.each([
    ["阿", "a"],
    ["八", "b"],
    ["擦", "c"],
    ["打", "d"],
    ["额", "e"],
    ["发", "f"],
    ["个", "g"],
    ["哈", "h"],
    ["加", "j"],
    ["开", "k"],
    ["拉", "l"],
    ["妈", "m"],
    ["那", "n"],
    ["哦", "o"],
    ["怕", "p"],
    ["七", "q"],
    ["然", "r"],
    ["三", "s"],
    ["他", "t"],
    ["它", "t"],
    ["我", "w"],
    ["西", "x"],
    ["一", "y"],
    ["在", "z"],
  ])("%s 的拼音首字母是 %s", (character, initial) => {
    expect(pinyinInitialOf(character)).toBe(initial);
  });
});

describe("pinyinInitialOf 的分界处", () => {
  it.each([
    ["驁", "a", "丷", "b"],
    ["簿", "b", "嚓", "c"],
    ["錯", "c", "咑", "d"],
    ["鵽", "d", "妸", "e"],
    ["樲", "e", "发", "f"],
    ["酜", "f", "旮", "g"],
    ["過", "g", "哈", "h"],
    ["靃", "h", "丌", "j"],
    ["攟", "j", "咔", "k"],
    ["鬠", "k", "垃", "l"],
    ["纙", "l", "呣", "m"],
    ["鞪", "m", "拏", "n"],
    ["糯", "n", "喔", "o"],
    ["慪", "o", "妑", "p"],
    ["曝", "p", "七", "q"],
    ["裠", "q", "呥", "r"],
    ["鶸", "r", "仨", "s"],
    ["鎖", "s", "他", "t"],
    ["籜", "t", "屲", "w"],
    ["錻", "w", "夕", "x"],
    ["潠", "x", "丫", "y"],
    ["抣", "y", "帀", "z"],
  ])(
    "%s 是 %s, 紧接着的 %s 是 %s",
    (lastCharacter, lastInitial, firstCharacter, firstInitial) => {
      expect(pinyinInitialOf(lastCharacter)).toBe(lastInitial);
      expect(pinyinInitialOf(firstCharacter)).toBe(firstInitial);
    },
  );
});

describe("pinyinInitialOf 的常用字与多音字", () => {
  it.each([
    ["邮", "y"],
    ["箱", "x"],
    ["淘", "t"],
    ["宝", "b"],
    ["微", "w"],
    ["信", "x"],
    ["国", "g"],
    ["中", "z"],
    ["龘", "d"],
    ["〇", "l"],
  ])("常用字 %s 的拼音首字母是 %s", (character, initial) => {
    expect(pinyinInitialOf(character)).toBe(initial);
  });

  it.each([
    ["重", "z"],
    ["长", "z"],
    ["行", "x"],
    ["乐", "l"],
    ["曾", "c"],
    ["单", "d"],
    ["和", "h"],
    ["区", "q"],
    ["朝", "c"],
    ["解", "j"],
  ])("多音字 %s 取运行环境的固定读音, 首字母是 %s", (character, initial) => {
    expect(pinyinInitialOf(character)).toBe(initial);
  });
});

describe("pinyinInitialOf 的无读音汉字", () => {
  it.each(["兙", "兡", "嗧", "々", "㐀", "𠀀"])(
    "没有读音的汉字 %s 没有首字母",
    (character) => {
      expect(pinyinInitialOf(character)).toBeUndefined();
    },
  );
});
