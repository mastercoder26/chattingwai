import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// CSS stub for tsx node environment
const req = createRequire(import.meta.url);
if (req.extensions) {
  req.extensions['.css'] = () => {};
}

import { ChecklistComponentView } from '../components/intelligent-ui/checklist';
import { TabsComponentView } from '../components/intelligent-ui/tabs';
import { AccordionComponentView } from '../components/intelligent-ui/accordion';
import { CalloutComponentView } from '../components/intelligent-ui/callout';
import { RichText } from '../components/markdown';
import type { ChecklistItem, TabItem, AccordionItem } from '../components/intelligent-ui/types';

// ============================================================================
// LIGHTWEIGHT HOOK RUNNER FOR TESTING REACT CLIENT INTERACTION IN NODE
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VDomNode = React.ReactElement<any>;

type HookComponent<P> = (props: P) => React.ReactElement | null;

interface HookRunner<P> {
  render: (props?: P) => VDomNode;
  getState: (index?: number) => unknown;
}

function createHookRunner<P extends object>(
  Component: HookComponent<P>,
  initialProps: P,
): HookRunner<P> {
  const stateMap = new Map<number, unknown>();
  let stateIndex = 0;

  function render(currentProps?: P): React.ReactElement {
    stateIndex = 0;
    // Access React client hook dispatcher internals
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
          H: Record<string, unknown> | null;
        };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const prevH = internals.H;
    internals.H = {
      useState<S>(initial: S | (() => S)): [S, (action: S | ((prev: S) => S)) => void] {
        const idx = stateIndex++;
        if (!stateMap.has(idx)) {
          stateMap.set(idx, typeof initial === 'function' ? (initial as () => S)() : initial);
        }
        const state = stateMap.get(idx) as S;
        const setState = (action: S | ((prev: S) => S)) => {
          const next =
            typeof action === 'function'
              ? (action as (prev: S) => S)(stateMap.get(idx) as S)
              : action;
          stateMap.set(idx, next);
        };
        return [state, setState];
      },
      useRef<T>(initial: T): { current: T } {
        const idx = stateIndex++;
        if (!stateMap.has(idx)) {
          stateMap.set(idx, { current: initial });
        }
        return stateMap.get(idx) as { current: T };
      },
      useMemo<T>(fn: () => T): T {
        return fn();
      },
      useCallback<T extends (...args: unknown[]) => unknown>(fn: T): T {
        return fn;
      },
      useEffect(): void {},
      useId(): string {
        return 'test-id';
      },
      useTransition(): [boolean, (cb: () => void) => void] {
        return [false, (cb) => cb()];
      },
    };

    try {
      const vdom = Component(currentProps || initialProps);
      if (!vdom) {
        throw new Error('Component rendered null');
      }
      return vdom;
    } finally {
      internals.H = prevH;
    }
  }

  return {
    render,
    getState: (idx = 0) => stateMap.get(idx),
  };
}

// ============================================================================
// ADVERSARIAL CHALLENGER 2 TEST SUITE
// ============================================================================

describe('Adversarial Challenger 2: Interactive Isolation, Markdown Non-Regression & Smart Auto-Scroll', () => {
  // --------------------------------------------------------------------------
  // 1. INTERACTIVE STATE ISOLATION
  // --------------------------------------------------------------------------
  describe('1. Interactive State Isolation', () => {
    describe('Checklist toggling & isolation', () => {
      it('toggling a checklist item updates local checked state and progress counter without side effects', () => {
        const items: ChecklistItem[] = [
          { id: 'task-1', text: 'Define database schema', checked: false },
          { id: 'task-2', text: 'Configure replica pool', checked: true },
          { id: 'task-3', text: 'Deploy service', checked: false },
        ];

        // Deep freeze input items to prove parent props are NOT mutated
        const frozenItems = JSON.parse(JSON.stringify(items));
        Object.freeze(frozenItems);
        frozenItems.forEach(Object.freeze);

        const runner = createHookRunner(ChecklistComponentView, {
          title: 'Infrastructure Readiness',
          items: frozenItems,
        });

        // 1. Initial Render
        let vdom = runner.render();
        const header = vdom.props.children[0];
        const initialCountText = header.props.children[1].props.children.join('');
        assert.equal(initialCountText, 'Completed: 1 / 3 (33%)');

        const ul = vdom.props.children[2];
        const li0 = ul.props.children[0];
        const btn0 = li0.props.children[0];

        // Form submission prevention checks
        assert.equal(
          btn0.props.type,
          'button',
          'Checklist button must explicitly have type="button" to prevent form submission',
        );
        assert.equal(btn0.props['aria-checked'], false);
        assert.equal(btn0.props.role, 'checkbox');

        // 2. Click checkbox button with mock event to verify preventDefault and stopPropagation
        let prevented = false;
        let stopped = false;
        const mockSyntheticEvent = {
          preventDefault: () => {
            prevented = true;
          },
          stopPropagation: () => {
            stopped = true;
          },
        };

        btn0.props.onClick(mockSyntheticEvent);
        assert.equal(
          prevented,
          true,
          'Checklist toggle must call e.preventDefault() to avoid form submit',
        );
        assert.equal(
          stopped,
          true,
          'Checklist toggle must call e.stopPropagation() to avoid bubbling to chat bubble handlers',
        );

        // 3. Re-render after state change
        vdom = runner.render();
        const updatedHeader = vdom.props.children[0];
        const updatedCountText = updatedHeader.props.children[1].props.children.join('');
        assert.equal(
          updatedCountText,
          'Completed: 2 / 3 (67%)',
          'Progress counter must accurately reflect toggled item',
        );

        const updatedUl = vdom.props.children[2];
        const updatedBtn0 = updatedUl.props.children[0].props.children[0];
        const updatedText0 = updatedUl.props.children[0].props.children[1];
        assert.equal(updatedBtn0.props['aria-checked'], true);
        assert.ok(
          updatedText0.props.className.includes('done'),
          'Text must receive done styling class when completed',
        );

        // 4. Clicking label text also toggles item
        updatedText0.props.onClick(mockSyntheticEvent);
        vdom = runner.render();
        const finalUl = vdom.props.children[2];
        const finalBtn0 = finalUl.props.children[0].props.children[0];
        assert.equal(finalBtn0.props['aria-checked'], false, 'Clicking label text must toggle item back');

        // 5. Verify keyboard handling: Space and Enter keys toggle
        let keyPrevented = false;
        finalBtn0.props.onKeyDown({
          key: ' ',
          preventDefault: () => {
            keyPrevented = true;
          },
          stopPropagation: () => {},
        });
        assert.equal(keyPrevented, true);
        vdom = runner.render();
        const reCheckedBtn0 = vdom.props.children[2].props.children[0].props.children[0];
        assert.equal(reCheckedBtn0.props['aria-checked'], true, 'Spacebar must toggle checkbox');

        // 6. Ensure original props were never modified
        assert.equal(frozenItems[0].checked, false, 'Parent props must remain completely immutable');
      });
    });

    describe('Tabs switching & keyboard navigation', () => {
      it('active tab changes locally with keyboard (ArrowLeft/Right, Home/End) and click without triggering form submission', () => {
        const tabs: TabItem[] = [
          { id: 'tab-overview', label: 'Overview', content: 'Overview content' },
          { id: 'tab-code', label: 'Code', content: 'Code content' },
          { id: 'tab-logs', label: 'Logs', content: 'Logs content' },
        ];

        const runner = createHookRunner(TabsComponentView, { tabs });

        // Initial render: first tab selected
        let vdom = runner.render();
        let tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons.length, 3);

        // Verify type="button" to prevent form submission
        tabButtons.forEach((btn: React.ReactElement<{ type: string }>) => {
          assert.equal(
            btn.props.type,
            'button',
            'Tab triggers must have type="button" to prevent form submission',
          );
        });

        assert.equal(tabButtons[0].props['aria-selected'], true);
        assert.equal(tabButtons[0].props.tabIndex, 0);
        assert.equal(tabButtons[1].props['aria-selected'], false);
        assert.equal(tabButtons[1].props.tabIndex, -1);

        // 1. Keyboard ArrowRight navigation from tab 0 to tab 1
        let prevented = false;
        tabButtons[0].props.onKeyDown(
          {
            key: 'ArrowRight',
            preventDefault: () => {
              prevented = true;
            },
          },
          0,
        );
        assert.equal(prevented, true, 'ArrowRight navigation must call e.preventDefault()');

        vdom = runner.render();
        tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons[1].props['aria-selected'], true);
        assert.equal(tabButtons[1].props.tabIndex, 0);
        assert.equal(tabButtons[0].props['aria-selected'], false);

        // 2. Keyboard End key: jumps to last tab (tab 2)
        prevented = false;
        tabButtons[1].props.onKeyDown(
          {
            key: 'End',
            preventDefault: () => {
              prevented = true;
            },
          },
          1,
        );
        assert.equal(prevented, true);

        vdom = runner.render();
        tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons[2].props['aria-selected'], true);

        // 3. ArrowRight at last tab: cyclic wrap-around to tab 0
        prevented = false;
        tabButtons[2].props.onKeyDown(
          {
            key: 'ArrowRight',
            preventDefault: () => {
              prevented = true;
            },
          },
          2,
        );
        assert.equal(prevented, true);

        vdom = runner.render();
        tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons[0].props['aria-selected'], true, 'ArrowRight at end must wrap to first tab');

        // 4. ArrowLeft at first tab: cyclic wrap-around to tab 2
        prevented = false;
        tabButtons[0].props.onKeyDown(
          {
            key: 'ArrowLeft',
            preventDefault: () => {
              prevented = true;
            },
          },
          0,
        );
        assert.equal(prevented, true);

        vdom = runner.render();
        tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons[2].props['aria-selected'], true, 'ArrowLeft at start must wrap to last tab');

        // 5. Home key: jumps back to tab 0
        prevented = false;
        tabButtons[2].props.onKeyDown(
          {
            key: 'Home',
            preventDefault: () => {
              prevented = true;
            },
          },
          2,
        );
        assert.equal(prevented, true);

        vdom = runner.render();
        tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons[0].props['aria-selected'], true, 'Home key must jump to first tab');

        // 6. Direct click selection
        tabButtons[1].props.onClick();
        vdom = runner.render();
        tabButtons = vdom.props.children[0].props.children;
        assert.equal(tabButtons[1].props['aria-selected'], true, 'Clicking tab trigger must select tab');

        // Verify active tab panel content matches selected tab
        const panel = vdom.props.children[1];
        assert.equal(panel.props.id, 'ui-tab-panel-tab-code');
        assert.equal(panel.props['aria-labelledby'], 'ui-tab-tab-code');
      });
    });

    describe('Accordion item toggle & isolation', () => {
      it('accordion item expands and collapses locally with proper ARIA attributes', () => {
        const items: AccordionItem[] = [
          { id: 'acc-1', title: 'Section 1', content: 'Details 1', defaultOpen: false },
          { id: 'acc-2', title: 'Section 2', content: 'Details 2', defaultOpen: true },
        ];

        const runner = createHookRunner(AccordionComponentView, { items });

        let vdom = runner.render();
        let accItems = vdom.props.children;
        assert.equal(accItems.length, 2);

        // Section 1: initially collapsed
        const btn0 = accItems[0].props.children[0];
        const panel0 = accItems[0].props.children[1];
        assert.equal(btn0.props.type, 'button', 'Accordion trigger must be type="button"');
        assert.equal(btn0.props['aria-expanded'], false);
        assert.equal(panel0.props.hidden, true);

        // Section 2: initially expanded via defaultOpen
        const btn1 = accItems[1].props.children[0];
        const panel1 = accItems[1].props.children[1];
        assert.equal(btn1.props['aria-expanded'], true);
        assert.equal(panel1.props.hidden, false);

        // Toggle Section 1 open
        btn0.props.onClick();
        vdom = runner.render();
        accItems = vdom.props.children;
        const updatedBtn0 = accItems[0].props.children[0];
        const updatedPanel0 = accItems[0].props.children[1];
        assert.equal(updatedBtn0.props['aria-expanded'], true);
        assert.equal(updatedPanel0.props.hidden, false);

        // Toggle Section 2 closed
        const updatedBtn1 = accItems[1].props.children[0];
        updatedBtn1.props.onClick();
        vdom = runner.render();
        accItems = vdom.props.children;
        const finalBtn1 = accItems[1].props.children[0];
        const finalPanel1 = accItems[1].props.children[1];
        assert.equal(finalBtn1.props['aria-expanded'], false);
        assert.equal(finalPanel1.props.hidden, true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 2. STANDARD MARKDOWN NON-REGRESSION
  // --------------------------------------------------------------------------
  describe('2. Standard Markdown Non-Regression', () => {
    it('renders standard code blocks with syntax highlighting and copy buttons', () => {
      const codeMd = [
        '```python',
        'def fibonacci(n: int) -> int:',
        '    if n <= 1: return n',
        '    return fibonacci(n - 1) + fibonacci(n - 2)',
        '```',
        '',
        '```typescript',
        'interface ServiceConfig {',
        '  port: number;',
        '  host: string;',
        '}',
        'export const config: ServiceConfig = { port: 8080, host: "localhost" };',
        '```',
      ].join('\n');

      const html = renderToStaticMarkup(React.createElement(RichText, { content: codeMd }));

      // CodeBlock wrapper and copy buttons
      assert.ok(html.includes('class="code-block"'), 'Must render .code-block wrapper');
      assert.ok(html.includes('class="code-toolbar"'), 'Must render toolbar with Copy button');
      assert.ok(html.includes('Copy code'), 'Toolbar must have Copy code button text');

      // Syntax highlighting tokens via rehype-highlight
      assert.ok(html.includes('language-python'), 'Must preserve python language class');
      assert.ok(html.includes('language-typescript'), 'Must preserve typescript language class');
      assert.ok(html.includes('hljs-keyword'), 'Must generate hljs syntax token classes');
    });

    it('renders KaTeX math expressions ($...$ and $$...$$) correctly via rehype-katex', () => {
      const mathMd = [
        'Einstein energy-mass equivalence is $E = mc^2$.',
        '',
        'Gaussian integral:',
        '$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
      ].join('\n');

      const html = renderToStaticMarkup(React.createElement(RichText, { content: mathMd }));

      assert.ok(html.includes('class="katex"'), 'KaTeX root class must be generated');
      assert.ok(html.includes('class="katex-mathml"'), 'MathML math accessibility tags must be generated');
      assert.ok(html.includes('class="katex-html"'), 'Visual KaTeX spans must be generated');
      assert.ok(html.includes('xmlns="http://www.w3.org/1998/Math/MathML"'), 'MathML namespace must be present');
    });

    it('renders GFM tables and task lists without regression', () => {
      const gfmContent = [
        '| Name | Type | Description |',
        '| :--- | :--- | :--- |',
        '| id | string | Unique entity key |',
        '| active | boolean | Flag state |',
        '',
        '- [x] Implement test coverage',
        '- [ ] Verify edge cases',
      ].join('\n');

      const html = renderToStaticMarkup(React.createElement(RichText, { content: gfmContent }));

      // Table wrapped in table-scroll
      assert.ok(html.includes('class="table-scroll"'), 'Table must be wrapped in responsive scroll container');
      assert.ok(html.includes('<table>'), 'Table element must render');
      assert.ok(html.includes('Unique entity key'), 'Table contents must render');

      // Task list items
      assert.ok(html.includes('type="checkbox"'), 'Task lists must render checkboxes');
      assert.ok(html.includes('checked=""'), 'Checked task items must have checked attribute');
      assert.ok(html.includes('Implement test coverage'));
      assert.ok(html.includes('Verify edge cases'));
    });

    it('nested={true} prevents infinite recursive rendering when markdown contains embedded UI blocks', () => {
      const maliciousEmbeddedPayload = [
        '# Documentation',
        'Here is an example snippet:',
        '```intelligent-ui',
        JSON.stringify({
          type: 'callout',
          variant: 'warning',
          title: 'Inner Warning',
          content: 'This inner callout must not cause infinite recursive mounting',
        }),
        '```',
      ].join('\n');

      // 1. Direct RichText with nested=true
      const directHtml = renderToStaticMarkup(
        React.createElement(RichText, { content: maliciousEmbeddedPayload, nested: true }),
      );
      assert.ok(
        directHtml.includes('class="code-block"'),
        'nested=true must render as standard CodeBlock instead of mounting IntelligentUIRenderer',
      );
      assert.ok(
        !directHtml.includes('class="ui-callout"'),
        'Must NOT mount ui-callout when nested=true',
      );

      // 2. Embedded inside Tabs component
      const tabsHtml = renderToStaticMarkup(
        React.createElement(TabsComponentView, {
          tabs: [{ id: 'tab-nested', label: 'Nested Tab', content: maliciousEmbeddedPayload }],
        }),
      );
      assert.ok(
        tabsHtml.includes('class="code-block"'),
        'Tabs must pass nested=true preventing recursive component mounting',
      );
      assert.ok(!tabsHtml.includes('ui-callout-warning'));

      // 3. Embedded inside Accordion component
      const accordionHtml = renderToStaticMarkup(
        React.createElement(AccordionComponentView, {
          items: [
            {
              id: 'acc-nested',
              title: 'Nested Accordion',
              content: maliciousEmbeddedPayload,
              defaultOpen: true,
            },
          ],
        }),
      );
      assert.ok(
        accordionHtml.includes('class="code-block"'),
        'Accordion must pass nested=true preventing recursive component mounting',
      );
      assert.ok(!accordionHtml.includes('ui-callout-warning'));

      // 4. Embedded inside Callout component
      const calloutHtml = renderToStaticMarkup(
        React.createElement(CalloutComponentView, {
          variant: 'info',
          title: 'Outer Callout',
          content: maliciousEmbeddedPayload,
        }),
      );
      assert.ok(
        calloutHtml.includes('class="code-block"'),
        'Callout must pass nested=true preventing recursive component mounting',
      );
      assert.ok(!calloutHtml.includes('ui-callout-warning'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. SMART STREAMING AUTO-SCROLL
  // --------------------------------------------------------------------------
  describe('3. Smart Streaming Auto-Scroll', async () => {
    const { computeScrollPinning } = await import('../components/chat-workspace');

    describe('computeScrollPinning mathematical contract', () => {
      it('verifies exact threshold boundaries at 60px', () => {
        // Exactly at boundary
        const atBoundary = computeScrollPinning(1000, 540, 400, 60);
        assert.equal(atBoundary.distanceToBottom, 60);
        assert.equal(atBoundary.isAtBottom, true);
        assert.equal(atBoundary.showScroll, false);

        // 1px above boundary: scrolled up to 61px
        const aboveBoundary = computeScrollPinning(1000, 539, 400, 60);
        assert.equal(aboveBoundary.distanceToBottom, 61);
        assert.equal(aboveBoundary.isAtBottom, false);
        assert.equal(aboveBoundary.showScroll, true);

        // 1px below boundary: scrolled down to 59px
        const belowBoundary = computeScrollPinning(1000, 541, 400, 60);
        assert.equal(belowBoundary.distanceToBottom, 59);
        assert.equal(belowBoundary.isAtBottom, true);
        assert.equal(belowBoundary.showScroll, false);
      });

      it('handles floating point and subpixel scroll positions robustly', () => {
        const subpixelDetached = computeScrollPinning(1500.8, 940.1, 500, 60);
        // distance = 1500.8 - 940.1 - 500 = 60.7 (> 60)
        assert.equal(subpixelDetached.isAtBottom, false);
        assert.equal(subpixelDetached.showScroll, true);

        const subpixelPinned = computeScrollPinning(1500.8, 940.9, 500, 60);
        // distance = 1500.8 - 940.9 - 500 = 59.9 (<= 60)
        assert.equal(subpixelPinned.isAtBottom, true);
        assert.equal(subpixelPinned.showScroll, false);
      });

      it('handles overscroll, negative scroll distance, and zero-height containers safely', () => {
        // Elastic overscroll on iOS / macOS trackpads
        const overscroll = computeScrollPinning(1000, 650, 400, 60);
        // distance = 1000 - 650 - 400 = -50
        assert.equal(overscroll.distanceToBottom, -50);
        assert.equal(overscroll.isAtBottom, true);
        assert.equal(overscroll.showScroll, false);

        // Short container where content fits entirely without scrolling
        const shortContent = computeScrollPinning(250, 0, 500, 60);
        // distance = 250 - 0 - 500 = -250
        assert.equal(shortContent.isAtBottom, true);
        assert.equal(shortContent.showScroll, false);
      });
    });

    describe('Streaming detachment & scroll freezing simulation', () => {
      it('prevents auto-scroll snap-back when user scrolls up during active token generation', () => {
        // Simulated chat workspace scrolling container
        class ChatScrollEnvironment {
          clientHeight = 400;
          scrollHeight = 400;
          scrollTop = 0;
          isAtBottomRef = true;
          showScroll = false;
          scrollCalls: Array<{ behavior: string; top: number }> = [];

          scrollToBottom(behavior: 'instant' | 'smooth') {
            this.scrollTop = this.scrollHeight - this.clientHeight;
            this.scrollCalls.push({ behavior, top: this.scrollTop });
          }

          // Triggered on user manual touch/wheel scroll
          userScroll(newScrollTop: number) {
            this.scrollTop = newScrollTop;
            const { isAtBottom, showScroll } = computeScrollPinning(
              this.scrollHeight,
              this.scrollTop,
              this.clientHeight,
              60,
            );
            this.isAtBottomRef = isAtBottom;
            this.showScroll = showScroll;
          }

          // Triggered on new token chunk arriving over SSE/stream
          receiveStreamTokenChunk(chunkHeight: number) {
            this.scrollHeight += chunkHeight;
            // Identical to useEffect([active?.messages, streaming, scrollToBottom]) in chat-workspace.tsx
            if (this.isAtBottomRef) {
              this.scrollToBottom('instant');
            }
          }
        }

        const env = new ChatScrollEnvironment();

        // Phase 1: Streaming while user is initially pinned to bottom
        for (let i = 0; i < 5; i++) {
          env.receiveStreamTokenChunk(120);
        }
        assert.equal(env.isAtBottomRef, true, 'User starts pinned');
        assert.equal(env.showScroll, false);
        assert.equal(env.scrollCalls.length, 5, 'Auto-scroll triggers on each token chunk while pinned');
        assert.equal(env.scrollTop, 1000 - 400); // 600

        // Phase 2: User manually scrolls up to inspect previous message
        // User scrolls to scrollTop = 300 (distance = 1000 - 300 - 400 = 300px > 60px)
        env.userScroll(300);
        assert.equal(env.isAtBottomRef, false, 'Must detach user from auto-scroll when distance > 60px');
        assert.equal(env.showScroll, true, 'Must display scroll-to-bottom button when detached');

        const callsBeforeNewTokens = env.scrollCalls.length;

        // Phase 3: 15 more chunks stream in while user is reading scrolled up
        for (let i = 0; i < 15; i++) {
          env.receiveStreamTokenChunk(100);
        }

        // VERIFICATION OF CORE BUG FIX:
        // User reading position MUST NOT be snapped back to bottom!
        assert.equal(
          env.scrollTop,
          300,
          'User scroll position MUST remain frozen at reading location and NOT snap to bottom',
        );
        assert.equal(
          env.scrollCalls.length,
          callsBeforeNewTokens,
          'scrollToBottom must NOT be called while user is detached',
        );
        assert.equal(env.isAtBottomRef, false);
        assert.equal(env.showScroll, true);

        // Phase 4: User scrolls back down near bottom
        // scrollHeight is now 2500. User scrolls to scrollTop = 2050 (distance = 2500 - 2050 - 400 = 50px <= 60px)
        env.userScroll(2050);
        assert.equal(env.isAtBottomRef, true, 'Must automatically re-pin when user scrolls within 60px');
        assert.equal(env.showScroll, false, 'Must hide scroll-to-bottom button when re-pinned');

        // Phase 5: Additional streaming tokens resume auto-scrolling
        env.receiveStreamTokenChunk(100);
        assert.equal(
          env.scrollCalls.length,
          callsBeforeNewTokens + 1,
          'Auto-scroll must resume once re-pinned',
        );
        assert.equal(env.scrollTop, 2600 - 400); // 2200
      });
    });
  });
});
