'use client';

import { useCallback, useEffect, useRef } from 'react';
import '@/app/attachment-motion.css';

/** Capture composer thumbnails immediately before moving attachments into a message. */
export function useAttachmentFlight(enabled: boolean) {
  const cleanup = useRef<(() => void) | null>(null);
  const cancel = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
  }, []);

  useEffect(() => cancel, [cancel, enabled]);

  const launch = useCallback(
    (messageId: string) => {
      cancel();
      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!enabled || motionPreference.matches) return;

      const sources = Array.from(
        document.querySelectorAll<HTMLImageElement>('.composer img[data-attachment-image]'),
      )
        .map((image) => ({
          index: image.dataset.attachmentIndex,
          src: image.currentSrc || image.src,
          rect: image.getBoundingClientRect(),
          radius: getComputedStyle(image).borderRadius,
          fit: getComputedStyle(image).objectFit,
        }))
        .filter(({ index, src, rect }) => index !== undefined && src && rect.width && rect.height);
      if (!sources.length) return;

      let frame = 0;
      let attempts = 0;
      let stopped = false;
      const flights: { image: HTMLImageElement; animation: Animation; restore: () => void }[] = [];

      const stop = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(frame);
        flights.forEach(({ image, animation, restore }) => {
          animation.cancel();
          image.remove();
          restore();
        });
        window.removeEventListener('resize', stop);
        window.removeEventListener('scroll', stop, true);
        window.removeEventListener('pagehide', stop);
        motionPreference.removeEventListener('change', stop);
      };
      cleanup.current = stop;
      window.addEventListener('resize', stop, { passive: true });
      window.addEventListener('pagehide', stop);
      motionPreference.addEventListener('change', stop);

      const findTarget = () => {
        if (stopped) return;
        attempts += 1;
        const message = Array.from(
          document.querySelectorAll<HTMLElement>('[data-message-id]'),
        ).find((element) => element.dataset.messageId === messageId);
        const targets = message
          ? Array.from(message.querySelectorAll<HTMLImageElement>('img[data-attachment-image]'))
          : [];

        // Allow React to commit and the message scroll position to settle first.
        if (attempts < 3 || targets.length < sources.length) {
          if (attempts < 16) frame = requestAnimationFrame(findTarget);
          else stop();
          return;
        }

        sources.forEach((source) => {
          const target = targets.find((image) => image.dataset.attachmentIndex === source.index);
          if (!target || !target.isConnected) return;
          const destination = target.getBoundingClientRect();
          if (
            !destination.width ||
            !destination.height ||
            destination.bottom <= 0 ||
            destination.top >= window.innerHeight
          )
            return;

          const image = document.createElement('img');
          image.src = source.src;
          image.alt = '';
          image.className = 'attachment-flight';
          image.setAttribute('aria-hidden', 'true');
          Object.assign(image.style, {
            left: `${source.rect.left}px`,
            top: `${source.rect.top}px`,
            width: `${source.rect.width}px`,
            height: `${source.rect.height}px`,
            borderRadius: source.radius,
            objectFit: source.fit,
          });
          document.body.append(image);

          const visibility = target.style.getPropertyValue('visibility');
          const priority = target.style.getPropertyPriority('visibility');
          const restore = () => {
            if (visibility) target.style.setProperty('visibility', visibility, priority);
            else target.style.removeProperty('visibility');
          };

          try {
            const animation = image.animate(
              [
                { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
                {
                  transform: `translate(${destination.left - source.rect.left}px, ${destination.top - source.rect.top}px) scale(${destination.width / source.rect.width}, ${destination.height / source.rect.height})`,
                  borderRadius: getComputedStyle(target).borderRadius,
                  opacity: 1,
                },
              ],
              { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
            );
            target.style.setProperty('visibility', 'hidden');
            flights.push({ image, animation, restore });
          } catch {
            image.remove();
            restore();
          }
        });

        if (!flights.length) {
          stop();
          return;
        }
        // A moving destination should be revealed immediately, never left concealed.
        window.addEventListener('scroll', stop, { passive: true, capture: true });
        void Promise.allSettled(flights.map(({ animation }) => animation.finished)).then(stop);
      };

      frame = requestAnimationFrame(findTarget);
    },
    [cancel, enabled],
  );

  return { launch, cancel };
}

/** Render only while the attachment is actually being read or resized. */
export function AttachmentProgress({ name }: { name: string }) {
  return (
    <span className="attachment-progress" role="status" aria-live="polite">
      <span className="attachment-progress-grid" aria-hidden="true">
        <span>{'. : . : .'}</span>
        <span>{': . : . :'}</span>
        <span>{'. : . : .'}</span>
      </span>
      <span className="attachment-progress-copy" aria-hidden="true">
        <span className="attachment-progress-name">{name}</span>
        <span className="attachment-progress-caption">Preparing attachment</span>
      </span>
      <span className="attachment-progress-sr">Preparing {name}</span>
    </span>
  );
}
