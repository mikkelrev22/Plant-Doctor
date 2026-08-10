import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * On web, react-native-web's `Modal` renders the dialog with
 * `aria-modal="true"`, which implicitly hides the rest of the document from
 * assistive technology. That triggers a Chrome warning when a control retains
 * focus inside a subtree the browser considers aria-hidden:
 *
 *   "Blocked aria-hidden on an element because its descendant retained focus.
 *    ... Consider using the inert attribute instead ..."
 *
 * Two moments produce it:
 *  - Open: the Pressable that triggered the modal (e.g. "All chats") keeps
 *    focus while the background is hidden.
 *  - Close: a focused control inside the exiting modal stays focused while the
 *    modal is hidden during its exit animation.
 *
 * This hook removes focus from the offending element on each transition (web
 * only; no-op on native). On open it defers past the modal focus trap's initial
 * move and only blurs if focus is still in the background; on close it blurs
 * whatever is focused so the hiding modal has no focused descendant. The focus
 * trap still restores focus to the trigger after the modal unmounts.
 *
 * Pass the modal's `visible` flag.
 */
export function useWebModalA11y(visible: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    if (!visible) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      return;
    }

    // Defer past the focus trap's initial focus move; only blur if focus is
    // still outside the aria-modal dialog (i.e. on the background trigger).
    const id = window.setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el && !el.closest('[aria-modal="true"]')) el.blur?.();
    }, 0);
    return () => window.clearTimeout(id);
  }, [visible]);
}