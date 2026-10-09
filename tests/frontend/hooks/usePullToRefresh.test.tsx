import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";

function Harness({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const pull = usePullToRefresh({ onRefresh, threshold: 20 });
  return (
    <div
      data-testid="pull-root"
      onTouchStart={pull.onTouchStart}
      onTouchEnd={pull.onTouchEnd}
      onTouchCancel={pull.onTouchCancel}
    >
      {pull.refreshing ? <span role="status">در حال تازه‌سازی</span> : null}
    </div>
  );
}

describe("usePullToRefresh", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("refreshes after a downward pull from the top of the page", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<Harness onRefresh={onRefresh} />);
    const root = screen.getByTestId("pull-root");

    fireEvent.touchStart(root, { touches: [{ identifier: 1, clientX: 0, clientY: 10 }] });
    await act(async () => {
      fireEvent.touchEnd(root, { changedTouches: [{ identifier: 1, clientX: 0, clientY: 50 }] });
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not refresh when the gesture is too short", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<Harness onRefresh={onRefresh} />);
    const root = screen.getByTestId("pull-root");

    fireEvent.touchStart(root, { touches: [{ identifier: 1, clientX: 0, clientY: 10 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ identifier: 1, clientX: 0, clientY: 20 }] });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
