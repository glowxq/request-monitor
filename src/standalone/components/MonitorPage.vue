<template>
  <div class="monitor-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><Monitor /></el-icon>
          请求监听
        </h1>
        <div class="page-subtitle">实时监控网络请求，记录错误和异常</div>
      </div>
      <div class="header-right">
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-value">{{ requests.length }}</div>
            <div class="stat-label">总请求数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ successCount }}</div>
            <div class="stat-label">成功请求</div>
          </div>
          <div class="stat-card error">
            <div class="stat-value">{{ errorCount }}</div>
            <div class="stat-label">错误请求</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">{{ validationErrorCount }}</div>
            <div class="stat-label">验证异常</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button
          :type="isMonitoring ? 'danger' : 'primary'"
          @click="$emit('toggle-monitoring')"
          size="default"
          class="primary-action"
        >
          <el-icon><VideoPlay v-if="!isMonitoring" /><VideoPause v-if="isMonitoring" /></el-icon>
          {{ isMonitoring ? '停止监听' : '开始监听' }}
        </el-button>

        <el-button @click="$emit('clear-requests')" :disabled="requests.length === 0">
          <el-icon><Delete /></el-icon>
          清空记录
        </el-button>

        <el-button @click="$emit('export-data')" :disabled="requests.length === 0">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>

      <div class="action-right">
        <!-- 筛选标签 -->
        <div class="filter-tabs">
          <el-button
            :type="filter === 'all' ? 'primary' : ''"
            size="small"
            @click="filter = 'all'"
            class="filter-btn"
          >
            全部 ({{ requests.length }})
          </el-button>
          <el-button
            :type="filter === 'error' ? 'danger' : ''"
            size="small"
            @click="filter = 'error'"
            class="filter-btn"
          >
            错误 ({{ errorCount }})
          </el-button>
          <el-button
            :type="filter === 'validation' ? 'warning' : ''"
            size="small"
            @click="filter = 'validation'"
            class="filter-btn"
          >
            验证异常 ({{ validationErrorCount }})
          </el-button>
          <el-button
            :type="filter === 'problem' ? 'info' : ''"
            size="small"
            @click="filter = 'problem'"
            class="filter-btn"
          >
            问题接口 ({{ problemCount }})
          </el-button>
        </div>

        <!-- 搜索框 -->
        <el-input
          v-model="searchQuery"
          placeholder="搜索URL、方法或状态码..."
          size="default"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="requests-container">
      <div v-if="filteredRequests.length > 0" class="requests-list">
        <div
          v-for="request in filteredRequests"
          :key="request.id"
          class="request-item"
          :class="{
            error: request.status >= 400,
            'validation-error': request.hasValidationError
          }"
          @click="showRequestDetail(request)"
        >
          <div class="request-main">
            <div class="request-header">
              <div class="method-status">
                <span class="method" :class="request.method.toLowerCase()">
                  {{ request.method }}
                </span>
                <span class="status" :class="getStatusClass(request.status)">
                  {{ request.status }}
                </span>
              </div>
              <div class="request-time">
                {{ formatTime(request.timestamp) }}
              </div>
            </div>

            <div class="request-url">
              {{ request.url }}
            </div>

            <div class="request-meta">
              <div class="meta-item">
                <span class="meta-label">耗时:</span>
                <span class="meta-value">{{ request.duration || 0 }}ms</span>
              </div>
              <div class="meta-item" v-if="request.responseSize">
                <span class="meta-label">大小:</span>
                <span class="meta-value">{{ formatSize(request.responseSize) }}</span>
              </div>
              <div class="meta-item" v-if="request.hasValidationError">
                <el-icon class="warning-icon"><Warning /></el-icon>
                <span class="meta-value error-text">验证失败</span>
              </div>
            </div>
          </div>

          <div class="request-actions">
            <el-button size="small" text @click.stop="copyRequestInfo(request)">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <el-icon><DocumentRemove /></el-icon>
        <p>{{
          filter === 'problem' ? '暂无问题接口' :
          filter === 'error' ? '暂无错误请求' :
          filter === 'validation' ? '暂无验证异常请求' :
          '暂无请求记录'
        }}</p>
        <p v-if="!isMonitoring && config.apiPrefixes.length === 0" class="hint">
          请先在配置页面添加API前缀并开始监听
        </p>
      </div>
    </div>

    <!-- 请求详情弹窗 -->
    <RequestDetailDialog
      v-model="showDetailDialog"
      :request="selectedRequest"
      @copy-curl="handleCopyCurl"
      @copy-response="handleCopyResponse"
      @send-curl="handleSendCurl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  VideoPlay,
  VideoPause,
  Delete,
  Download,
  Search,
  DocumentRemove,
  CopyDocument,
  Warning
} from '@element-plus/icons-vue'

// 导入组件和工具
import RequestDetailDialog from '../../popup/components/RequestDetailDialog.vue'
import { copyToClipboard, formatTime, formatSize } from '@/utils'

// 导入类型
import type { NetworkRequest, MonitorConfig } from '@/types'

// Props
interface Props {
  requests: NetworkRequest[]
  config: MonitorConfig
  isMonitoring: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'toggle-monitoring': []
  'clear-requests': []
  'export-data': []
  'update-config': [config: Partial<MonitorConfig>]
}>()

// 响应式数据
const filter = ref<'all' | 'error' | 'validation' | 'problem'>('all')
const searchQuery = ref('')
const showDetailDialog = ref(false)
const selectedRequest = ref<NetworkRequest | null>(null)

// 计算属性
const successCount = computed(() =>
  props.requests.filter(req => req.status >= 200 && req.status < 400).length
)

const errorCount = computed(() =>
  props.requests.filter(req => req.status >= 400).length
)

const validationErrorCount = computed(() =>
  props.requests.filter(req => req.hasValidationError).length
)

const problemCount = computed(() =>
  props.requests.filter(req => req.status >= 400 || req.hasValidationError).length
)

const filteredRequests = computed(() => {
  let filtered = props.requests

  // 根据筛选条件过滤
  if (filter.value === 'error') {
    filtered = filtered.filter(req => req.status >= 400)
  } else if (filter.value === 'validation') {
    filtered = filtered.filter(req => req.hasValidationError)
  } else if (filter.value === 'problem') {
    filtered = filtered.filter(req => req.status >= 400 || req.hasValidationError)
  }

  // 根据搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(req =>
      req.url.toLowerCase().includes(query) ||
      req.method.toLowerCase().includes(query) ||
      req.status.toString().includes(query)
    )
  }

  return filtered
})

// 方法
const getStatusClass = (status: number) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'error'
  return 'info'
}

const showRequestDetail = (request: NetworkRequest) => {
  selectedRequest.value = request
  showDetailDialog.value = true
}

const copyRequestInfo = async (request: NetworkRequest) => {
  const info = `${request.method} ${request.url} - ${request.status}`
  await copyToClipboard(info)
  ElMessage.success('请求信息已复制')
}

const handleCopyCurl = (curl: string) => {
  // 处理复制CURL命令
  ElMessage.success('CURL命令已复制')
}

const handleCopyResponse = (response: string) => {
  // 处理复制响应内容
  ElMessage.success('响应内容已复制')
}

const handleSendCurl = (curl: string) => {
  // 处理发送CURL命令
  ElMessage.info('CURL命令已发送到控制台')
}
</script>

<style lang="scss" scoped>
.monitor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    margin: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .header-left {
      .page-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        color: #1d1d1f;
        letter-spacing: -0.02em;

        .el-icon {
          font-size: 26px;
          color: #0ea5e9;
        }
      }

      .page-subtitle {
        font-size: 14px;
        color: #86868b;
        font-weight: 500;
      }
    }

    .header-right {
      .header-stats {
        display: flex;
        gap: 16px;

        .stat-card {
          text-align: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          min-width: 80px;

          .stat-value {
            display: block;
            font-size: 20px;
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 11px;
            color: #86868b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          &.error {
            border-color: rgba(239, 68, 68, 0.2);
            background: rgba(239, 68, 68, 0.05);

            .stat-value {
              color: #ef4444;
            }
          }

          &.warning {
            border-color: rgba(245, 158, 11, 0.2);
            background: rgba(245, 158, 11, 0.05);

            .stat-value {
              color: #f59e0b;
            }
          }
        }
      }
    }
  }

  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    margin: 0 16px 16px 16px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .action-left {
      display: flex;
      gap: 12px;

      .primary-action {
        font-weight: 600;
      }
    }

    .action-right {
      display: flex;
      align-items: center;
      gap: 16px;

      .filter-tabs {
        display: flex;
        gap: 8px;

        .filter-btn {
          font-size: 12px;
          padding: 6px 12px;
        }
      }

      .search-input {
        width: 280px;

        :deep(.el-input__wrapper) {
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.8);

          &:hover {
            border-color: rgba(0, 122, 255, 0.3);
          }

          &.is-focus {
            border-color: #007aff;
            box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
          }
        }
      }
    }
  }

  .requests-container {
    flex: 1;
    margin: 0 16px 16px 16px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .requests-list {
      flex: 1;
      overflow-y: auto;

      .request-item {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(14, 165, 233, 0.05);
        }

        &:last-child {
          border-bottom: none;
        }

        &.error {
          border-left: 4px solid #ef4444;
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
        }

        &.validation-error {
          border-left: 4px solid #f59e0b;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
        }

        .request-main {
          flex: 1;

          .request-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;

            .method-status {
              display: flex;
              gap: 8px;

              .method {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;

                &.get { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                &.post { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                &.put { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                &.delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                &.patch { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
              }

              .status {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;

                &.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                &.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                &.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                &.info { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
              }
            }

            .request-time {
              font-size: 12px;
              color: #86868b;
              font-weight: 500;
            }
          }

          .request-url {
            font-size: 14px;
            color: #1d1d1f;
            font-weight: 500;
            margin-bottom: 8px;
            word-break: break-all;
          }

          .request-meta {
            display: flex;
            gap: 16px;
            align-items: center;

            .meta-item {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;

              .meta-label {
                color: #86868b;
                font-weight: 500;
              }

              .meta-value {
                color: #1d1d1f;
                font-weight: 600;

                &.error-text {
                  color: #f59e0b;
                }
              }

              .warning-icon {
                color: #f59e0b;
                font-size: 14px;
              }
            }
          }
        }

        .request-actions {
          .el-button {
            color: #86868b;

            &:hover {
              color: #0ea5e9;
            }
          }
        }
      }
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #86868b;
      font-size: 14px;

      .el-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      p {
        margin: 4px 0;
        font-weight: 500;

        &.hint {
          font-size: 12px;
          opacity: 0.8;
        }
      }
    }
  }
}
</style>
