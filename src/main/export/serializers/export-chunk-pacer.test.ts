import { describe, expect, it } from "vitest";

import { createSerializeFixture } from "../../testing/export-serializer-fixture";
import { ExportCancelledError } from "../export-errors";
import { createChunkPacer, EXPORT_CHUNK_SIZE } from "./export-chunk-pacer";

describe("分块节奏器", () => {
  it("每一步都报告进度, 每完成一块才让出一次事件循环", async () => {
    const fixture = createSerializeFixture();
    const pacer = createChunkPacer(fixture.context, 3);
    for (let step = 0; step < 7; step += 1) {
      await pacer.tick();
    }
    expect(fixture.progress.total).toBe(7);
    expect(fixture.yields.count).toBe(2);
  });

  it("默认每 250 步让出一次", async () => {
    expect(EXPORT_CHUNK_SIZE).toBe(250);
    const fixture = createSerializeFixture();
    const pacer = createChunkPacer(fixture.context);
    for (let step = 0; step < 500; step += 1) {
      await pacer.tick();
    }
    expect(fixture.yields.count).toBe(2);
  });

  it("用户取消后下一步以取消错误拒绝", async () => {
    const fixture = createSerializeFixture();
    const pacer = createChunkPacer(fixture.context);
    await pacer.tick();
    fixture.cancel();
    await expect(pacer.tick()).rejects.toBeInstanceOf(ExportCancelledError);
  });
});
