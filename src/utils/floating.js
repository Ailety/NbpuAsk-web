const DEFAULT_VIEWPORT_PADDING = 8

export function getFloatingPosition(
  rect,
  {
    floatingWidth = 0,
    floatingHeight = 0,
    preferred = 'auto',
    align = 'left',
    gap = 4,
    viewportPadding = DEFAULT_VIEWPORT_PADDING,
  } = {},
) {
  const rawLeft = align === 'center' ? rect.left + rect.width / 2 - floatingWidth / 2 : rect.left
  const enoughBelow = window.innerHeight - rect.bottom >= floatingHeight + gap
  const placeAbove = preferred === 'above' || (preferred === 'auto' && !enoughBelow)
  const rawTop = placeAbove ? rect.top - floatingHeight - gap : rect.bottom + gap

  return {
    left: `${Math.max(viewportPadding, Math.min(rawLeft, window.innerWidth - floatingWidth - viewportPadding))}px`,
    top: `${Math.max(viewportPadding, Math.min(rawTop, window.innerHeight - floatingHeight - viewportPadding))}px`,
    visibility: 'visible',
  }
}

export function getHiddenFloatingStyle(rect, align = 'left') {
  const left = align === 'center' ? rect.left + rect.width / 2 : rect.left

  return {
    left: `${left}px`,
    top: `${rect.bottom}px`,
    visibility: 'hidden',
  }
}

export function getTooltipStyle(rect, { placement = 'above', gap = 8 } = {}) {
  const preferred = placement === 'below' ? 'below' : 'above'

  return {
    left: `${rect.left + rect.width / 2}px`,
    top: preferred === 'below' ? `${rect.bottom + gap}px` : `${rect.top - gap}px`,
    transform: preferred === 'below' ? 'translateX(-50%)' : 'translate(-50%, -100%)',
  }
}
