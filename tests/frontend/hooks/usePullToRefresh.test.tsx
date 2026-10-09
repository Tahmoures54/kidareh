import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TouchEvent as ReactTouchEvent } from "react";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";

function touchAt(y: number, target: Element = document.body): ReactTouchEvent<HTMLElement> {
  return {
    touches: [{ clientY: y }],
    target,
    currentTarget: target,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  } as unknown as ReactTouchEvent<HTMLElement>;
}

describe("usePullToRefresh", () => {
  it("refreshes after a downward pull from the top of the page", async () => {
    const onRefresh = vi.fn(async () => undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 60 }));

    await act(async () => {
      result.current.onTouchStart(touchAt(100));
      result.current.onTouchMove(touchAt(220));
      expect(result.current.pullDistance).toBeGreaterThanOrEqual(60);
      await result.current.onTouchEnd(touchAt(220));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullDistance).toBe(0);
  });

  it("does not refresh when the gesture starts on an interactive control", async () => {
    const button = document.createElement("button");
    document.body.append(button);
    const onRefresh = vi.fn(async () => undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    await act(async () => {
      result.current.onTouchStart(touchAt(100, button));
      result.current.onTouchMove(touchAt(240, button));
      await result.current.onTouchEnd(touchAt(240, button));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    button.remove();
  });
});
