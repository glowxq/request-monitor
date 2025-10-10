<template>
  <div
    v-if="isVisible && config.enableFloatingBall"
    class="floating-ball"
    :class="{
      'position-left': ballPosition === 'left',
      'position-right': ballPosition === 'right',
      'is-monitoring': isMonitoring,
      'has-errors': errorCount > 0
    }"
    :style="{
      top: position.y + 'px',
      [ballPosition]: '20px'
    }"
    @click="toggleSidebar"
    @mousedown="startDrag"
    :title="`网络监听器 - ${isMonitoring ? '监听中' : '已停止'}${errorCount > 0 ? ` (${errorCount}个错误)` : ''}`"
  >
    <!-- 主图标 -->
    <div class="ball-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>

    <!-- 状态指示器 -->
    <div class="status-dot" :class="{ active: isMonitoring }"></div>

    <!-- 错误计数徽章 -->
    <div v-if="errorCount > 0" class="error-badge">
      {{ errorCount > 99 ? '99+' : errorCount }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { MonitorConfig } from '@/types'

// 响应式数据
const isVisible = ref(true)  // 默认显示
const isDragging = ref(false)
const position = ref({ x: 0, y: 100 })
const isMonitoring = ref(false)
const errorCount = ref(0)
const totalRequests = ref(0)

// 配置
const config = ref<MonitorConfig>({
  enableFloatingBall: true,
  floatingBallPosition: 'right',
  devToolsSidebarWidth: 400,
  apiPrefixes: [],
  isActive: false,
  includeSuccessRequests: true,
  onlyRecordFetchXHR: true,
  maxRecords: 100,
  autoExport: false,
  enableConsoleLog: false,
  urlReplaceRules: [],
  responseValidationRules: [],
  quickCopyConfig: {
    responseHeaderField: 'X-Trace-Id',
    responseBodyField: 'requestId',
    enableDebugInfo: true
  },
  domainConfig: {
    enabled: true,
    domains: []
  }
})

// 计算属性
const ballPosition = computed(() => config.value.floatingBallPosition || 'right')

// 方法
const toggleSidebar = () => {
  if (!isDragging.value) {
    // 发送消息打开DevTools侧边栏
    chrome.runtime.sendMessage({ type: 'TOGGLE_DEVTOOLS_SIDEBAR' })
  }
}

// 拖拽功能
const startDrag = (e: MouseEvent) => {
  isDragging.value = false
  const startY = e.clientY - position.value.y
  let hasMoved = false

  const onMouseMove = (e: MouseEvent) => {
    if (!hasMoved && (Math.abs(e.clientY - (startY + position.value.y)) > 5)) {
      hasMoved = true
      isDragging.value = true
    }

    if (hasMoved) {
      const newY = e.clientY - startY
      position.value.y = Math.max(20, Math.min(window.innerHeight - 60, newY))
    }
  }

  const onMouseUp = () => {
    setTimeout(() => {
      isDragging.value = false
    }, 100)

    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)

    // 保存位置
    if (hasMoved) {
      chrome.storage.local.set({ floatingBallPosition: position.value })
    }
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

// 生命周期
onMounted(async () => {
  console.log('🎯 [FloatingBall] 组件开始挂载')

  // 加载配置和状态
  const result = await chrome.storage.local.get(['config', 'floatingBallPosition'])

  console.log('🔍 [FloatingBall] 加载的配置:', result)

  if (result.config) {
    config.value = { ...config.value, ...result.config }
    console.log('✅ [FloatingBall] 配置已更新:', config.value)
  }

  if (result.floatingBallPosition) {
    position.value = result.floatingBallPosition
    console.log('📍 [FloatingBall] 位置已更新:', position.value)
  }

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    console.log('📨 [FloatingBall] 收到消息:', message)
    switch (message.type) {
      case 'MONITORING_STATUS_CHANGED':
        isMonitoring.value = message.isActive
        break
      case 'REQUEST_STATS_UPDATED':
        totalRequests.value = message.total
        errorCount.value = message.errors
        break
      case 'CONFIG_UPDATED':
        config.value = { ...config.value, ...message.config }
        break
    }
  })

  // 请求初始状态
  chrome.runtime.sendMessage({ type: 'GET_FLOATING_BALL_STATUS' })

  console.log('✅ [FloatingBall] 组件挂载完成，当前状态:', {
    isVisible: isVisible.value,
    enableFloatingBall: config.value.enableFloatingBall,
    position: position.value
  })
})

onUnmounted(() => {
  // 清理事件监听器
})
</script>

<style lang="scss" scoped>
.floating-ball {
  position: fixed;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  user-select: none;
  z-index: 2147483646; // 比现有浮动侧边栏低一层
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
  }

  &.position-left {
    left: 20px;
  }

  &.position-right {
    right: 20px;
  }

  .ball-icon {
    color: #86868b;
    transition: color 0.3s ease;
  }

  &.is-monitoring .ball-icon {
    color: #22c55e;
  }

  .status-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ef4444;
    border: 2px solid white;
    transition: all 0.3s ease;

    &.active {
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
    }
  }

  .error-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    animation: pulse 2s infinite;
  }

  &.has-errors {
    .ball-icon {
      color: #ef4444;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
