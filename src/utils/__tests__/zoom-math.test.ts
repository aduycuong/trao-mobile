import { actualSizeScale, clamp, fitSize, maxOffset, offsetAfterZoom } from '@/utils/zoom-math';

const view = { width: 400, height: 800 };

describe('zoom math', () => {
  it('fits a photo inside the view keeping its shape', () => {
    expect(fitSize({ width: 2000, height: 1000 }, view)).toEqual({ width: 400, height: 200 });
    expect(fitSize({ width: 1000, height: 3000 }, view)).toEqual({
      width: 800 / 3,
      height: 800,
    });
    expect(fitSize(null, view)).toEqual(view);
  });

  it('lets a photo move only as far as its zoomed edge allows', () => {
    const fitted = { width: 400, height: 200 };
    expect(maxOffset(fitted, view, 1)).toEqual({ x: 0, y: 0 });
    // 3x: 1200 wide in a 400 view (400 each side), 600 high in an 800 view (still fits).
    expect(maxOffset(fitted, view, 3)).toEqual({ x: 400, y: 0 });
    expect(maxOffset(fitted, view, 6)).toEqual({ x: 1000, y: 200 });
  });

  it('zooms a double tap to the actual size, within 2 and 5', () => {
    const fitted = { width: 400, height: 200 };
    expect(actualSizeScale({ width: 1200, height: 600 }, fitted)).toBe(3);
    expect(actualSizeScale({ width: 500, height: 250 }, fitted)).toBe(2);
    expect(actualSizeScale({ width: 4000, height: 2000 }, fitted)).toBe(5);
    expect(actualSizeScale(null, fitted)).toBe(2.5);
  });

  it('keeps the point under the fingers in place while zooming', () => {
    const focal = { x: 100, y: -50 };
    const next = offsetAfterZoom(focal, { x: 0, y: 0 }, 1, 3);
    expect(next).toEqual({ x: -200, y: 100 });
    // Zooming back to 1 returns the photo to the middle.
    expect(offsetAfterZoom(focal, next, 3, 1)).toEqual({ x: 0, y: 0 });
  });

  it('clamps a value into a range', () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});
