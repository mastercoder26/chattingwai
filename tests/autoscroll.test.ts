import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Allow Node/tsx to require .css files without crashing
const req = createRequire(import.meta.url);
if (req.extensions) {
  req.extensions['.css'] = () => {};
}

describe('Smart Streaming Auto-Scroll Pinning Logic', async () => {
  const { computeScrollPinning } = await import('../components/chat-workspace');

  it('pins user to bottom when distance to bottom is 0 (fully scrolled down)', () => {
    // scrollHeight = 1000, clientHeight = 400, scrollTop = 600
    const result = computeScrollPinning(1000, 600, 400);
    assert.equal(result.distanceToBottom, 0);
    assert.equal(result.isAtBottom, true);
    assert.equal(result.showScroll, false);
  });

  it('pins user to bottom when distance to bottom is within 60px threshold', () => {
    // scrollHeight = 1000, clientHeight = 400, scrollTop = 570 (distance = 30px)
    const result = computeScrollPinning(1000, 570, 400);
    assert.equal(result.distanceToBottom, 30);
    assert.equal(result.isAtBottom, true);
    assert.equal(result.showScroll, false);
  });

  it('pins user to bottom at the exact 60px boundary', () => {
    // scrollHeight = 1000, clientHeight = 400, scrollTop = 540 (distance = 60px)
    const result = computeScrollPinning(1000, 540, 400);
    assert.equal(result.distanceToBottom, 60);
    assert.equal(result.isAtBottom, true);
    assert.equal(result.showScroll, false);
  });

  it('unpins user and marks scrolled-up when distance exceeds 60px', () => {
    // scrollHeight = 1000, clientHeight = 400, scrollTop = 539 (distance = 61px)
    const result = computeScrollPinning(1000, 539, 400);
    assert.equal(result.distanceToBottom, 61);
    assert.equal(result.isAtBottom, false);
    assert.equal(result.showScroll, true);
  });

  it('keeps user unpinned when user scrolls far up into history', () => {
    // scrollHeight = 2500, clientHeight = 500, scrollTop = 200 (distance = 1800px)
    const result = computeScrollPinning(2500, 200, 500);
    assert.equal(result.distanceToBottom, 1800);
    assert.equal(result.isAtBottom, false);
    assert.equal(result.showScroll, true);
  });

  it('handles short conversations where scrollHeight <= clientHeight', () => {
    // scrollHeight = 300, clientHeight = 600, scrollTop = 0
    const result = computeScrollPinning(300, 0, 600);
    assert.ok(result.distanceToBottom <= 0);
    assert.equal(result.isAtBottom, true);
    assert.equal(result.showScroll, false);
  });

  it('handles fractional / subpixel scroll positions accurately', () => {
    const result = computeScrollPinning(1200.4, 740.1, 400);
    // 1200.4 - 740.1 - 400 = 60.3 (> 60)
    assert.equal(result.isAtBottom, false);
    assert.equal(result.showScroll, true);

    const nearResult = computeScrollPinning(1200.4, 740.9, 400);
    // 1200.4 - 740.9 - 400 = 59.5 (<= 60)
    assert.equal(nearResult.isAtBottom, true);
    assert.equal(nearResult.showScroll, false);
  });

  it('supports custom threshold configuration', () => {
    const customResult = computeScrollPinning(1000, 500, 400, 120);
    // distance = 100 <= 120
    assert.equal(customResult.distanceToBottom, 100);
    assert.equal(customResult.isAtBottom, true);
    assert.equal(customResult.showScroll, false);
  });
});
