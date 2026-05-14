import { ref } from 'vue'
import { getTooltipStyle } from '@/utils/floating'

export function useFloatingTooltip() {
  const tooltip = ref({
    visible: false,
    text: '',
  })
  const tooltipStyle = ref({})

  function showTooltip(event, text, options = {}) {
    const rect = event.currentTarget.getBoundingClientRect()
    const { placement = 'above', gap } = options

    tooltip.value = {
      visible: true,
      text,
    }

    tooltipStyle.value = getTooltipStyle(rect, { placement, gap })
  }

  function hideTooltip() {
    tooltip.value.visible = false
  }

  return {
    tooltip,
    tooltipStyle,
    showTooltip,
    hideTooltip,
  }
}
