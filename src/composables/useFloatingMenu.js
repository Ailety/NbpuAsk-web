import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { getFloatingPosition, getHiddenFloatingStyle } from '@/utils/floating'

export function useFloatingMenu() {
  const activeKey = ref(null)
  const floatingRef = ref(null)
  const floatingStyle = ref({})
  const isOpen = computed(() => activeKey.value !== null)

  async function open(key, event, options = {}) {
    const { preferred = 'auto', align = 'left' } = options
    const anchorRect = event.currentTarget.getBoundingClientRect()

    activeKey.value = key
    floatingStyle.value = getHiddenFloatingStyle(anchorRect, align)

    await nextTick()

    const menuRect = floatingRef.value?.getBoundingClientRect()
    if (menuRect) {
      floatingStyle.value = getFloatingPosition(anchorRect, {
        floatingWidth: menuRect.width,
        floatingHeight: menuRect.height,
        preferred,
        align,
      })
    }

    document.addEventListener('click', close)
  }

  function close() {
    activeKey.value = null
    floatingStyle.value = {}
    document.removeEventListener('click', close)
  }

  function toggle(key, event, options = {}) {
    if (activeKey.value === key) {
      close()
      return false
    }

    open(key, event, options)
    return true
  }

  onBeforeUnmount(() => {
    document.removeEventListener('click', close)
  })

  return {
    activeKey,
    isOpen,
    floatingRef,
    floatingStyle,
    open,
    close,
    toggle,
  }
}
