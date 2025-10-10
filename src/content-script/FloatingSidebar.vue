<template>
  <div
    v-if="isVisible && config.enableFloatingSidebar"
    class="floating-sidebar"
    :class="{
      expanded: isExpanded,
      'position-left': sidebarPosition === 'left',
      'position-right': sidebarPosition === 'right'
    }"
    :style="{
      '--sidebar-opacity': sidebarOpacity,
      top: position.y + 'px',
      [sidebarPosition]: '0px'
    }"
  >
    <!-- 收起状态的触发按钮 -->
    <div
      v-if="!isExpanded"
      class="sidebar-trigger"
      @click="toggleSidebar"
      @mousedown="startDrag"
      :title="'网络监听器 - ' + (isMonitoring ? '监听中' : '已停止')"
    >
      <div class="trigger-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="trigger-status" :class="{ active: isMonitoring }"></div>
      <div v-if="errorCount > 0" class="error-badge">{{ errorCount }}</div>
    </div>

    <!-- 展开状态的完整侧边栏 -->
    <div v-if="isExpanded" class="sidebar-content">
      <!-- 头部 -->
      <div class="sidebar-header">
        <div class="header-info">
          <div class="logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div class="title">网络监听器</div>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="openFullscreen" title="打开全屏界面">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
          <button class="action-btn close-btn" @click="closeSidebar" title="关闭侧边栏">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 状态区域 -->
      <div class="status-section">
        <div class="status-indicator" :class="{ active: isMonitoring }">
          <div class="status-dot"></div>
          <span class="status-text">{{ isMonitoring ? '监听中' : '已停止' }}</span>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ totalRequests }}</div>
            <div class="stat-label">总请求</div>
          </div>
          <div class="stat-item error">
            <div class="stat-value">{{ errorCount }}</div>
            <div class="stat-label">错误</div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <button
          class="action-button primary"
          :class="{ danger: isMonitoring }"
          @click="toggleMonitoring"
          :disabled="isLoading"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="!isMonitoring" d="M8 5v14l11-7z"/>
            <path v-else d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          {{ isMonitoring ? '停止' : '开始' }}
        </button>

        <button
          class="action-button secondary"
          @click="clearRequests"
          :disabled="totalRequests === 0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          清空
        </button>
      </div>

      <!-- 最近请求预览 -->
      <div class="recent-requests" v-if="recentRequests.length > 0">
        <div class="section-title">最近请求</div>
        <div class="request-list">
          <div
            v-for="request in recentRequests.slice(0, 3)"
            :key="request.id"
            class="request-item"
            :class="{ error: request.status >= 400 }"
            @click="showRequestDetail(request)"
          >
            <div class="request-method" :class="request.method.toLowerCase()">
              {{ request.method }}
            </div>
            <div class="request-info">
              <div class="request-url">{{ formatUrl(request.url) }}</div>
              <div class="request-status">{{ request.status }}</div>
            </div>
          </div>
        </div>
        <button class="view-all-btn" @click="openFullscreen">
          查看全部 ({{ totalRequests }})
        </button>
      </div>

      <!-- 拖拽手柄 -->
      <div class="drag-handle" @mousedown="startDrag">
        <div class="drag-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 导入类型
import type { NetworkRequest, MonitorConfig } from '@/types'

// 响应式数据
const isVisible = ref(true)
const isExpanded = ref(false)
const isMonitoring = ref(false)
const isLoading = ref(false)
const totalRequests = ref(0)
const errorCount = ref(0)
const recentRequests = ref<NetworkRequest[]>([])
const position = ref({ x: 0, y: 100 })
const isDragging = ref(false)

// 配置
const config = ref<MonitorConfig>({
  enableFloatingSidebar: true,
  sidebarPosition: 'right',
  sidebarOpacity: 0.95,
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
const sidebarPosition = computed(() => config.value.sidebarPosition || 'right')
const sidebarOpacity = computed(() => config.value.sidebarOpacity || 0.95)

// 方法
const toggleSidebar = () => {
  isExpanded.value = !isExpanded.value
}

const closeSidebar = () => {
  isVisible.value = false
  // 保存用户偏好
  chrome.storage.local.set({ floatingSidebarVisible: false })
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
  totalRequests.value = 0
  errorCount.value = 0
  recentRequests.value = []
}

const showRequestDetail = (request: NetworkRequest) => {
  // 发送消息到background，让其打开详情
  chrome.runtime.sendMessage({
    type: 'SHOW_REQUEST_DETAIL',
    request
  })
}

const formatUrl = (url: string) => {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname + urlObj.search
    return path.length > 30 ? path.substring(0, 30) + '...' : path
  } catch {
    return url.length > 30 ? url.substring(0, 30) + '...' : url
  }
}

// 拖拽功能
const startDrag = (e: MouseEvent) => {
  if (e.target === e.currentTarget || (e.target as Element).closest('.drag-handle')) {
    isDragging.value = true
    const startY = e.clientY - position.value.y

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.value) {
        const newY = e.clientY - startY
        position.value.y = Math.max(0, Math.min(window.innerHeight - 100, newY))
      }
    }

    const onMouseUp = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      // 保存位置
      chrome.storage.local.set({ floatingSidebarPosition: position.value })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }
}

// 初始化和消息监听
onMounted(async () => {
  // 加载配置和状态
  const result = await chrome.storage.local.get([
    'config',
    'floatingSidebarVisible',
    'floatingSidebarPosition'
  ])

  if (result.config) {
    config.value = { ...config.value, ...result.config }
  }

  if (result.floatingSidebarVisible !== undefined) {
    isVisible.value = result.floatingSidebarVisible
  }

  if (result.floatingSidebarPosition) {
    position.value = result.floatingSidebarPosition
  }

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'MONITORING_STATUS_CHANGED':
        isMonitoring.value = message.isActive
        break
      case 'REQUEST_STATS_UPDATED':
        totalRequests.value = message.total
        errorCount.value = message.errors
        break
      case 'RECENT_REQUESTS_UPDATED':
        recentRequests.value = message.requests
        break
      case 'CONFIG_UPDATED':
        config.value = { ...config.value, ...message.config }
        break
    }
  })

  // 请求初始状态
  chrome.runtime.sendMessage({ type: 'GET_SIDEBAR_STATUS' })
})

onUnmounted(() => {
  // 清理事件监听器
})
</script>

<style lang="scss" scoped>
.floating-sidebar {
  position: fixed;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.position-right {
    right: 0;
  }

  &.position-left {
    left: 0;
  }

  // 收起状态的触发按钮
  .sidebar-trigger {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, var(--sidebar-opacity));
    backdrop-filter: blur(20px);
    border-radius: 12px 0 0 12px;
    box-shadow: -2px 0 20px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-right: none;

    &:hover {
      background: rgba(255, 255, 255, 0.98);
      transform: translateX(-2px);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    }

    .trigger-icon {
      color: #0ea5e9;
      transition: all 0.2s ease;
    }

    .trigger-status {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      transition: all 0.2s ease;

      &.active {
        background: #22c55e;
        box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
      }
    }

    .error-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }
  }

  // 展开状态的完整侧边栏
  .sidebar-content {
    width: 280px;
    background: rgba(255, 255, 255, var(--sidebar-opacity));
    backdrop-filter: blur(20px);
    border-radius: 12px 0 0 12px;
    box-shadow: -2px 0 20px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-right: none;
    overflow: hidden;
    max-height: 80vh;
    display: flex;
    flex-direction: column;

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      background: rgba(248, 250, 252, 0.8);

      .header-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .logo {
          color: #0ea5e9;
        }

        .title {
          font-size: 14px;
          font-weight: 600;
          color: #1d1d1f;
        }
      }

      .header-actions {
        display: flex;
        gap: 4px;

        .action-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #86868b;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(0, 0, 0, 0.05);
            color: #1d1d1f;
          }

          &.close-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
        }
      }
    }

    .status-section {
      padding: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(239, 68, 68, 0.2);

        &.active {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.2);

          .status-dot {
            background: #22c55e;
            box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
          }

          .status-text {
            color: #16a34a;
          }
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          transition: all 0.2s ease;
        }

        .status-text {
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;

        .stat-item {
          text-align: center;
          padding: 8px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.05);

          &.error {
            background: rgba(239, 68, 68, 0.05);
            border-color: rgba(239, 68, 68, 0.1);

            .stat-value {
              color: #ef4444;
            }
          }

          .stat-value {
            font-size: 16px;
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 2px;
          }

          .stat-label {
            font-size: 10px;
            color: #86868b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        }
      }
    }

    .quick-actions {
      padding: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      display: flex;
      gap: 8px;

      .action-button {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;

        &.primary {
          background: #0ea5e9;
          color: white;

          &:hover {
            background: #0284c7;
          }

          &.danger {
            background: #ef4444;

            &:hover {
              background: #dc2626;
            }
          }
        }

        &.secondary {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;

          &:hover {
            background: rgba(107, 114, 128, 0.2);
            color: #4b5563;
          }
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .recent-requests {
      flex: 1;
      padding: 16px;
      overflow-y: auto;

      .section-title {
        font-size: 12px;
        font-weight: 600;
        color: #86868b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .request-list {
        .request-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          margin-bottom: 4px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(14, 165, 233, 0.05);
            border-color: rgba(14, 165, 233, 0.1);
          }

          &.error {
            border-left: 3px solid #ef4444;
            background: rgba(239, 68, 68, 0.05);
          }

          .request-method {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;

            &.get { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
            &.post { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
            &.put { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            &.delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
          }

          .request-info {
            flex: 1;
            min-width: 0;

            .request-url {
              font-size: 11px;
              color: #1d1d1f;
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .request-status {
              font-size: 10px;
              color: #86868b;
              font-weight: 500;
            }
          }
        }
      }

      .view-all-btn {
        width: 100%;
        padding: 8px;
        margin-top: 8px;
        border: 1px solid rgba(14, 165, 233, 0.2);
        background: rgba(14, 165, 233, 0.05);
        color: #0ea5e9;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(14, 165, 233, 0.1);
          border-color: rgba(14, 165, 233, 0.3);
        }
      }
    }

    .drag-handle {
      padding: 8px;
      text-align: center;
      cursor: move;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      background: rgba(248, 250, 252, 0.8);

      .drag-dots {
        display: flex;
        justify-content: center;
        gap: 3px;

        .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #d1d5db;
        }
      }

      &:hover .dot {
        background: #9ca3af;
      }
    }
  }

  // 左侧位置的样式调整
  &.position-left {
    .sidebar-trigger,
    .sidebar-content {
      border-radius: 0 12px 12px 0;
      box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
      border-left: none;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
    }

    .sidebar-trigger:hover {
      transform: translateX(2px);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    }
  }
}
</style>
