/**
 * Dialogs stack (section overlay → region picker / confirm dialog), but every
 * layer listens for Escape on window — so one BACK press would close all of
 * them at once. Layers call this to only react when they are the topmost
 * dialog. DOM order is the stacking order here: nested dialogs render inside
 * (or after) the layer that opened them.
 */
export function isTopmostDialog(el: Element | null): boolean {
  if (!el) return false;
  const dialogs = document.querySelectorAll('[role="dialog"]');
  return dialogs[dialogs.length - 1] === el;
}
