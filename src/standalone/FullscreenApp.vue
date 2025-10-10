<template>
  <div class="fullscreen-app">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- 侧边栏头部 -->
      <div class="sidebar-header">
        <div class="logo-section" v-show="!sidebarCollapsed">
          <el-icon class="logo-icon"><Monitor /></el-icon>
          <span class="logo-text">网络监听器</span>
        </div>
        <el-button
          class="collapse-btn"
          size="small"
          text
          @click="toggleSidebar"
          :icon="sidebarCollapsed ? ArrowRight : ArrowLeft"
        />
      </div>

      <!-- 状态指示器 -->
      <div class="status-section" v-show="!sidebarCollapsed">
        <div class="status-indicator" :class="{ active: isMonitoring }">
          <el-icon><Connection /></el-icon>
          <span>{{ isMonitoring ? '监听中' : '已停止' }}</span>
        </div>
      </div>

      <!-- 导航菜单 -->
      <div class="nav-menu">
        <div
          class="nav-item"
          :class="{ active: currentView === 'monitor' }"
          @click="setCurrentView('monitor')"
        >
          <el-icon><Monitor /></el-icon>
          <span v-show="!sidebarCollapsed">请求监听</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: currentView === 'config' }"
          @click="setCurrentView('config')"
        >
          <el-icon><Setting /></el-icon>
          <span v-show="!sidebarCollapsed">配置管理</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: currentView === 'export' }"
          @click="setCurrentView('export')"
        >
          <el-icon><Download /></el-icon>
          <span v-show="!sidebarCollapsed">数据导出</span>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions" v-show="!sidebarCollapsed">
        <el-button
          :type="isMonitoring ? 'danger' : 'primary'"
          @click="toggleMonitoring"
          :loading="isLoading"
          size="small"
          class="action-btn"
        >
          <el-icon><VideoPlay v-if="!isMonitoring" /><VideoPause v-if="isMonitoring" /></el-icon>
          {{ isMonitoring ? '停止监听' : '开始监听' }}
        </el-button>

        <el-button
          @click="clearRequests"
          size="small"
          :disabled="requests.length === 0"
          class="action-btn"
        >
          <el-icon><Delete /></el-icon>
          清空记录
        </el-button>

        <el-button
          @click="toggleFloatingSidebar"
          size="small"
          :type="config.enableFloatingSidebar ? 'success' : 'info'"
          class="action-btn floating-sidebar-btn"
          :title="config.enableFloatingSidebar ? '关闭浮动侧边栏' : '开启浮动侧边栏'"
        >
          <el-icon><Position /></el-icon>
          {{ config.enableFloatingSidebar ? '浮动栏已启用' : '启用浮动栏' }}
        </el-button>
      </div>

      <!-- 侧边栏底部 -->
      <div class="sidebar-footer">
        <div class="stats-mini" v-show="!sidebarCollapsed">
          <div class="stat-item">
            <span class="stat-value">{{ requests.length }}</span>
            <span class="stat-label">总请求</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ errorCount }}</span>
            <span class="stat-label">错误</span>
          </div>
        </div>

        <el-button
          class="contact-btn"
          size="small"
          text
          @click="showContactDialog = true"
          :icon="ChatDotRound"
          v-show="!sidebarCollapsed"
        >
          联系我
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 监听页面 -->
      <div v-if="currentView === 'monitor'" class="content-page">
        <MonitorPage
          :requests="requests"
          :config="config"
          :is-monitoring="isMonitoring"
          @toggle-monitoring="toggleMonitoring"
          @clear-requests="clearRequests"
          @export-data="exportData"
          @update-config="updateConfig"
        />
      </div>

      <!-- 配置页面 -->
      <div v-if="currentView === 'config'" class="content-page">
        <ConfigPage
          :config="config"
          @update-config="updateConfig"
        />
      </div>

      <!-- 导出页面 -->
      <div v-if="currentView === 'export'" class="content-page">
        <ExportPage
          :requests="requests"
          @export-data="exportData"
        />
      </div>
    </div>

    <!-- 联系我弹窗 -->
    <ContactDialog v-model="showContactDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  Setting,
  Download,
  Connection,
  ArrowLeft,
  ArrowRight,
  VideoPlay,
  VideoPause,
  Delete,
  ChatDotRound,
  Position
} from '@element-plus/icons-vue'

// 导入组件
import MonitorPage from './components/MonitorPage.vue'
import ConfigPage from './components/ConfigPage.vue'
import ExportPage from './components/ExportPage.vue'
import ContactDialog from '../popup/components/ContactDialog.vue'

// 导入类型
import type { NetworkRequest, MonitorConfig } from '@/types'

// 响应式数据
const sidebarCollapsed = ref(false)
const currentView = ref<'monitor' | 'config' | 'export'>('monitor')
const showContactDialog = ref(false)
const isLoading = ref(false)

// 从popup组件复用的数据和逻辑
const requests = ref<NetworkRequest[]>([])
const config = ref<MonitorConfig>({
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
  },
  // 浮动侧边栏配置
  enableFloatingSidebar: false,  // 默认关闭
  sidebarPosition: 'right',
  sidebarOpacity: 0.95,
  // 新悬浮球和DevTools侧边栏配置
  enableFloatingBall: true,  // 默认开启
  floatingBallPosition: 'right',
  devToolsSidebarWidth: 400
})

// 计算属性
const isMonitoring = computed(() => config.value.isActive)
const errorCount = computed(() =>
  requests.value.filter(req => req.status >= 400 || req.hasValidationError).length
)

// 方法
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // 保存侧边栏状态
  chrome.storage.local.set({ sidebarCollapsed: sidebarCollapsed.value })
}

const setCurrentView = (view: 'monitor' | 'config' | 'export') => {
  currentView.value = view
}

const toggleMonitoring = async () => {
  // 复用popup中的监听逻辑
  isLoading.value = true
  try {
    config.value.isActive = !config.value.isActive
    await chrome.storage.local.set({ config: config.value })

    if (config.value.isActive) {
      await chrome.runtime.sendMessage({ type: 'START_MONITORING', config: config.value })
    } else {
      await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' })
    }
  } catch (error) {
    console.error('切换监听状态失败:', error)
  } finally {
    isLoading.value = false
  }
}

const clearRequests = () => {
  requests.value = []
  chrome.storage.local.set({ requests: [] })
}

const exportData = () => {
  // 导出逻辑
  const dataStr = JSON.stringify({
    requests: requests.value,
    config: config.value,
    exportTime: new Date().toISOString()
  }, null, 2)

  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `network-requests-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const updateConfig = (newConfig: Partial<MonitorConfig>) => {
  config.value = { ...config.value, ...newConfig }
  chrome.storage.local.set({ config: config.value })
}

// 切换浮动侧边栏状态
const toggleFloatingSidebar = async () => {
  const newState = !config.value.enableFloatingSidebar
  config.value.enableFloatingSidebar = newState

  // 保存配置
  await chrome.storage.local.set({ config: config.value })

  // 发送消息到background script，让其通知所有content scripts
  try {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_CONFIG',
      payload: config.value
    })

    // 显示提示信息
    if (newState) {
      ElMessage.success({
        message: '浮动侧边栏已启用，将在所有网页上显示',
        duration: 1000
      })
    } else {
      ElMessage.info({
        message: '浮动侧边栏已关闭',
        duration: 1000
      })
    }
  } catch (error) {
    console.error('更新浮动侧边栏配置失败:', error)
    ElMessage.error({
      message: '配置更新失败，请重试',
      duration: 1000
    })
  }
}

// 初始化
onMounted(async () => {
  // 加载保存的数据
  const result = await chrome.storage.local.get(['config', 'requests', 'sidebarCollapsed'])
  if (result.config) {
    config.value = result.config
  }
  if (result.requests) {
    requests.value = result.requests
  }
  if (result.sidebarCollapsed !== undefined) {
    sidebarCollapsed.value = result.sidebarCollapsed
  }

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REQUEST_ADDED') {
      const request = message.payload as NetworkRequest
      requests.value.unshift(request)
      if (requests.value.length > config.value.maxRecords) {
        requests.value = requests.value.slice(0, config.value.maxRecords)
      }
    }
  })
})
</script>

<style lang="scss" scoped>
.fullscreen-app {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;

  .sidebar {
    width: 240px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.05);

    &.collapsed {
      width: 60px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);

      .logo-section {
        display: flex;
        align-items: center;
        gap: 10px;

        .logo-icon {
          font-size: 20px;
          color: #0ea5e9;
        }

        .logo-text {
          font-size: 16px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.02em;
        }
      }

      .collapse-btn {
        color: #86868b;
        padding: 4px;

        &:hover {
          color: #0ea5e9;
          background: rgba(14, 165, 233, 0.1);
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
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        font-size: 13px;
        font-weight: 500;

        &.active {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .el-icon {
          font-size: 14px;
        }
      }
    }

    .nav-menu {
      flex: 1;
      padding: 16px 0;

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin: 2px 8px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #86868b;
        font-size: 14px;
        font-weight: 500;

        &:hover {
          background: rgba(14, 165, 233, 0.08);
          color: #0ea5e9;
        }

        &.active {
          background: rgba(14, 165, 233, 0.12);
          color: #0ea5e9;
          font-weight: 600;
        }

        .el-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
      }
    }

    .quick-actions {
      padding: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);

      .action-btn {
        width: 100%;
        margin-bottom: 8px;
        font-size: 13px;

        &:last-child {
          margin-bottom: 0;
        }

        &.floating-sidebar-btn {
          border: 2px solid transparent;
          transition: all 0.3s ease;

          &.el-button--success {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            border-color: #22c55e;
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);

            &:hover {
              background: linear-gradient(135deg, #16a34a, #15803d);
              box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
              transform: translateY(-1px);
            }
          }

          &.el-button--info {
            background: linear-gradient(135deg, #6b7280, #4b5563);
            border-color: #6b7280;

            &:hover {
              background: linear-gradient(135deg, #4b5563, #374151);
              transform: translateY(-1px);
            }
          }
        }
      }
    }

    .sidebar-footer {
      padding: 16px;

      .stats-mini {
        display: flex;
        gap: 16px;
        margin-bottom: 12px;

        .stat-item {
          text-align: center;

          .stat-value {
            display: block;
            font-size: 16px;
            font-weight: 700;
            color: #1d1d1f;
          }

          .stat-label {
            display: block;
            font-size: 10px;
            color: #86868b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        }
      }

      .contact-btn {
        width: 100%;
        font-size: 13px;
        color: #86868b;

        &:hover {
          color: #0ea5e9;
        }
      }
    }
  }

  .main-content {
    flex: 1;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .content-page {
      flex: 1;
      height: 100%;
      overflow: hidden;
    }
  }
}
</style>
