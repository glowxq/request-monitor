<template>
  <div
    v-if="isVisible"
    class="devtools-sidebar"
    :class="{ 'is-resizing': isResizing }"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <!-- 调整大小的拖拽条 -->
    <div class="resize-handle" @mousedown="startResize"></div>

    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="header-left">
        <div class="logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="title">网络监听器</div>
        <div class="status-badge" :class="{ active: isMonitoring }">
          {{ isMonitoring ? '监听中' : '已停止' }}
        </div>
      </div>
      <div class="header-right">
        <button class="header-btn" @click="toggleMonitoring" :disabled="isLoading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="!isMonitoring" d="M8 5v14l11-7z"/>
            <path v-else d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <button class="header-btn" @click="clearRequests" :disabled="requests.length === 0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
        <button class="header-btn close-btn" @click="closeSidebar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stat-item">
        <span class="stat-label">总请求</span>
        <span class="stat-value">{{ totalRequests }}</span>
      </div>
      <div class="stat-item error" v-if="errorCount > 0">
        <span class="stat-label">错误</span>
        <span class="stat-value">{{ errorCount }}</span>
      </div>
      <div class="stat-item success" v-if="successCount > 0">
        <span class="stat-label">成功</span>
        <span class="stat-value">{{ successCount }}</span>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="requests-section">
      <div class="section-header">
        <span class="section-title">最近请求</span>
        <span class="section-count">({{ requests.length }})</span>
      </div>

      <div class="requests-list">
        <div
          v-for="request in requests.slice(0, 20)"
          :key="request.id"
          class="request-item"
          :class="{
            'is-error': request.status >= 400 || request.isValidationError,
            'is-success': request.status >= 200 && request.status < 300
          }"
          @click="selectRequest(request)"
        >
          <div class="request-method" :class="request.method.toLowerCase()">
            {{ request.method }}
          </div>
          <div class="request-info">
            <div class="request-url" :title="request.url">
              {{ getShortUrl(request.url) }}
            </div>
            <div class="request-meta">
              <span class="request-status" :class="getStatusClass(request.status)">
                {{ request.status }}
              </span>
              <span class="request-time">{{ formatTime(request.timestamp) }}</span>
              <span class="request-duration">{{ request.duration }}ms</span>
            </div>
          </div>
        </div>

        <div v-if="requests.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <p>暂无网络请求记录</p>
          <p class="empty-hint">{{ isMonitoring ? '等待网络请求...' : '请先开启监听' }}</p>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="sidebar-footer">
      <button class="footer-btn" @click="openFullscreen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
        全屏界面
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { NetworkRequest, MonitorConfig } from '@/types'

// 响应式数据
const isVisible = ref(false)
const isResizing = ref(false)
const isLoading = ref(false)
const sidebarWidth = ref(400)
const isMonitoring = ref(false)
const totalRequests = ref(0)
const errorCount = ref(0)
const requests = ref<NetworkRequest[]>([])

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
const successCount = computed(() =>
  requests.value.filter(req => req.status >= 200 && req.status < 300).length
)

// 方法
const closeSidebar = () => {
  isVisible.value = false
  // 保存用户偏好
  chrome.storage.local.set({ devToolsSidebarVisible: false })
}

const openFullscreen = () => {
  chrome.runtime.sendMessage({ type: 'OPEN_FULLSCREEN' })
}

const toggleMonitoring = async () => {
  isLoading.value = true
  try {
    const newState = !isMonitoring.value
    await chrome.runtime.sendMessage({
      type: newState ? 'START_MONITORING' : 'STOP_MONITORING',
      config: config.value
    })
    isMonitoring.value = newState
  } catch (error) {
    console.error('切换监听状态失败:', error)
  } finally {
    isLoading.value = false
  }
}

const clearRequests = async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' })
  requests.value = []
  totalRequests.value = 0
  errorCount.value = 0
}

const selectRequest = (request: NetworkRequest) => {
  // 可以在这里实现请求详情的显示
  console.log('选中请求:', request)
}

// 工具方法
const getShortUrl = (url: string) => {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname + urlObj.search
    return path.length > 50 ? path.substring(0, 47) + '...' : path
  } catch {
    return url.length > 50 ? url.substring(0, 47) + '...' : url
  }
}

const getStatusClass = (status: number) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 400) return 'error'
  return 'info'
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 调整大小功能
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  const onMouseMove = (e: MouseEvent) => {
    const deltaX = startX - e.clientX
    const newWidth = Math.max(300, Math.min(800, startWidth + deltaX))
    sidebarWidth.value = newWidth
  }

  const onMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)

    // 保存宽度
    chrome.storage.local.set({ devToolsSidebarWidth: sidebarWidth.value })
    config.value.devToolsSidebarWidth = sidebarWidth.value
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

// 暴露方法给父组件
const show = () => {
  isVisible.value = true
}

const hide = () => {
  isVisible.value = false
}

const toggle = () => {
  console.log('🔄 [DevToolsSidebar] 切换显示状态:', !isVisible.value)
  isVisible.value = !isVisible.value

  // 保存状态
  chrome.storage.local.set({ devToolsSidebarVisible: isVisible.value })

  // 如果显示，添加入场动画
  if (isVisible.value) {
    // 请求最新数据
    chrome.runtime.sendMessage({ type: 'GET_DEVTOOLS_SIDEBAR_STATUS' })
  }
}

// 生命周期
onMounted(async () => {
  console.log('🎯 [DevToolsSidebar] 组件开始挂载')

  // 加载配置
  const result = await chrome.storage.local.get(['config', 'devToolsSidebarWidth', 'requests'])

  if (result.config) {
    config.value = { ...config.value, ...result.config }
  }

  if (result.devToolsSidebarWidth) {
    sidebarWidth.value = result.devToolsSidebarWidth
  }

  if (result.requests) {
    requests.value = result.requests.slice(0, 50) // 只显示最近50个
  }

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    console.log('📨 [DevToolsSidebar] 收到消息:', message)
    switch (message.type) {
      case 'MONITORING_STATUS_CHANGED':
        isMonitoring.value = message.isActive
        break
      case 'REQUEST_STATS_UPDATED':
        totalRequests.value = message.total
        errorCount.value = message.errors
        break
      case 'RECENT_REQUESTS_UPDATED':
        requests.value = message.requests.slice(0, 50)
        break
      case 'CONFIG_UPDATED':
        config.value = { ...config.value, ...message.config }
        break
      case 'TOGGLE_DEVTOOLS_SIDEBAR':
        console.log('🔄 [DevToolsSidebar] 收到切换消息')
        toggle()
        break
      case 'SHOW_DEVTOOLS_SIDEBAR':
        show()
        break
      case 'HIDE_DEVTOOLS_SIDEBAR':
        hide()
        break
    }
  })

  // 监听自定义事件
  const container = document.getElementById('network-monitor-devtools-sidebar')
  if (container) {
    container.addEventListener('toggle-sidebar', () => {
      console.log('🔄 [DevToolsSidebar] 收到自定义切换事件')
      toggle()
    })
  }

  // 请求初始状态
  chrome.runtime.sendMessage({ type: 'GET_DEVTOOLS_SIDEBAR_STATUS' })

  console.log('✅ [DevToolsSidebar] 组件挂载完成')
})

onUnmounted(() => {
  // 清理事件监听器
})

// 暴露方法
defineExpose({
  show,
  hide,
  toggle
})
</script>

<style lang="scss" scoped>
.devtools-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: #1e1e1e;
  color: #cccccc;
  border-left: 1px solid #333333;
  z-index: 2147483645;
  display: flex;
  flex-direction: column;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 12px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-resizing {
    user-select: none;
  }

  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    z-index: 1;

    &:hover {
      background: #007acc;
    }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #2d2d30;
    border-bottom: 1px solid #333333;
    min-height: 40px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .logo {
        color: #007acc;
      }

      .title {
        font-weight: 600;
        color: #ffffff;
      }

      .status-badge {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        background: #dc3545;
        color: white;

        &.active {
          background: #28a745;
        }
      }
    }

    .header-right {
      display: flex;
      gap: 4px;

      .header-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #cccccc;
        cursor: pointer;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #3c3c3c;
          color: #ffffff;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.close-btn:hover {
          background: #dc3545;
          color: white;
        }
      }
    }
  }

  .stats-section {
    display: flex;
    gap: 12px;
    padding: 8px 12px;
    background: #252526;
    border-bottom: 1px solid #333333;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;

      .stat-label {
        font-size: 10px;
        color: #969696;
      }

      .stat-value {
        font-weight: 600;
        color: #ffffff;
      }

      &.error .stat-value {
        color: #f85149;
      }

      &.success .stat-value {
        color: #3fb950;
      }
    }
  }

  .requests-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .section-header {
      padding: 8px 12px;
      background: #2d2d30;
      border-bottom: 1px solid #333333;
      display: flex;
      align-items: center;
      gap: 4px;

      .section-title {
        font-weight: 600;
        color: #ffffff;
      }

      .section-count {
        color: #969696;
        font-size: 11px;
      }
    }

    .requests-list {
      flex: 1;
      overflow-y: auto;

      .request-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-bottom: 1px solid #333333;
        cursor: pointer;

        &:hover {
          background: #2a2d2e;
        }

        &.is-error {
          border-left: 3px solid #f85149;
        }

        &.is-success {
          border-left: 3px solid #3fb950;
        }

        .request-method {
          width: 40px;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 4px;
          border-radius: 2px;

          &.get { background: #3fb950; color: white; }
          &.post { background: #fd7e14; color: white; }
          &.put { background: #6f42c1; color: white; }
          &.delete { background: #dc3545; color: white; }
          &.patch { background: #20c997; color: white; }
        }

        .request-info {
          flex: 1;
          min-width: 0;

          .request-url {
            color: #ffffff;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .request-meta {
            display: flex;
            gap: 8px;
            margin-top: 2px;
            font-size: 10px;

            .request-status {
              &.success { color: #3fb950; }
              &.error { color: #f85149; }
              &.info { color: #58a6ff; }
            }

            .request-time {
              color: #969696;
            }

            .request-duration {
              color: #969696;
            }
          }
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #969696;
        text-align: center;

        p {
          margin: 8px 0 4px;
        }

        .empty-hint {
          font-size: 11px;
          color: #6e7681;
        }
      }
    }
  }

  .sidebar-footer {
    padding: 8px 12px;
    background: #2d2d30;
    border-top: 1px solid #333333;

    .footer-btn {
      width: 100%;
      padding: 6px 12px;
      border: 1px solid #333333;
      background: #3c3c3c;
      color: #cccccc;
      cursor: pointer;
      border-radius: 3px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;

      &:hover {
        background: #4c4c4c;
        color: #ffffff;
      }
    }
  }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>
