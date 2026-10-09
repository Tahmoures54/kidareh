import { act, renderHook } from "@testing-library/react";
import type { TouchEvent } from "react";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";

function touchAt(y: number): TouchEvent<HTMLElement> {
  return { touches: [{ clientY: y }] } as unknown as TouchEvent<HTMLElement>;
}

describe("usePullToRefresh", () => {
  it("refreshes only after the pull threshold is reached", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 50 }));

    act(() => result.current.handlers.onTouchStart(touchAt(0)));
    act(() => result.current.handlers.onTouchMove(touchAt(72)));
    await act(async () => {
      await result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
  });

  it("does not refresh for a short pull", async () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 70 }));

    act(() => result.current.handlers.onTouchStart(touchAt(10)));
    act(() => result.current.handlers.onTouchMove(touchAt(35)));
    await act(async () => {
      await result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
