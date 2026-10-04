import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";

import { EntryDetailPane } from "./entry-detail-pane";

describe("条目详情的附件插槽", () => {
  it("调用方给出的附件区渲染在备注之后, 并拿到当前条目的详情", async () => {
    const environment = await createEntryTestEnvironment({
      entries: [WALLET_ENTRY],
    });
    await environment.entryStore.getState().load();
    await environment.entryStore.getState().select(WALLET_ENTRY.id);

    render(
      <EntryDetailPane
        renderAttachments={(detail) => <p>附件区占位 {detail.id}</p>}
      />,
      { wrapper: environment.Providers },
    );

    const slot = await screen.findByText("附件区占位 wallet");
    const notes = screen.getByText(/备注第一行/);
    expect(
      Boolean(
        notes.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("没有给出附件区时详情里没有这一节", async () => {
    const environment = await createEntryTestEnvironment({
      entries: [WALLET_ENTRY],
    });
    await environment.entryStore.getState().load();
    await environment.entryStore.getState().select(WALLET_ENTRY.id);

    render(<EntryDetailPane />, { wrapper: environment.Providers });

    await screen.findByRole("heading", { name: "钱包" });
    expect(screen.queryByText(/附件区占位/)).toBeNull();
  });
});
