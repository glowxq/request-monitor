<template>
  <el-dialog
    v-model="visible"
    title="请求详情"
    width="580px"
    :before-close="handleClose"
    class="request-detail-dialog"
    append-to-body
    :destroy-on-close="false"
    :modal="true"
    :lock-scroll="false"
  >
    <div v-if="request" class="request-detail">
      <!-- 基本信息 -->
      <div class="basic-info">
        <div class="info-row">
          <span class="label">请求方法:</span>
          <el-tag :type="getMethodTagType(request.method)" size="small">
            {{ request.method }}
          </el-tag>
        </div>
        <div class="info-row">
          <span class="label">状态码:</span>
          <el-tag :type="request.isError ? 'danger' : 'success'" size="small">
            {{ request.status }} {{ request.statusText }}
          </el-tag>
        </div>
        <div class="info-row">
          <span class="label">响应时间:</span>
          <span class="value">{{ formatDuration(request.duration) }}</span>
        </div>
        <div class="info-row">
          <span class="label">请求时间:</span>
          <span class="value">{{ formatTimestamp(request.timestamp) }}</span>
        </div>
      </div>

      <!-- URL -->
      <div class="section">
        <div class="section-header">
          <h4>请求URL</h4>
          <el-button size="small" @click="copyText(request.url)">
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
        </div>
        <div class="url-display">{{ request.url }}</div>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 请求头 -->
        <el-tab-pane label="请求头" name="requestHeaders">
          <div class="headers-section">
            <div class="section-actions">
              <el-button size="small" @click="copyHeaders(request.requestHeaders)">
                <el-icon><CopyDocument /></el-icon>
                复制请求头
              </el-button>
            </div>
            <div v-if="Object.keys(request.requestHeaders || {}).length > 0" class="headers-list">
              <div
                v-for="[key, value] in Object.entries(request.requestHeaders)"
                :key="key"
                class="header-item"
              >
                <span class="header-key">{{ key }}:</span>
                <span class="header-value">{{ value }}</span>
              </div>
            </div>
            <div v-else class="empty-content">无请求头信息</div>
          </div>
        </el-tab-pane>

        <!-- 响应头 -->
        <el-tab-pane label="响应头" name="responseHeaders">
          <div class="headers-section">
            <div class="section-actions">
              <el-button size="small" @click="copyHeaders(request.responseHeaders)">
                <el-icon><CopyDocument /></el-icon>
                复制响应头
              </el-button>
            </div>
            <div v-if="Object.keys(request.responseHeaders || {}).length > 0" class="headers-list">
              <div
                v-for="[key, value] in Object.entries(request.responseHeaders)"
                :key="key"
                class="header-item"
              >
                <span class="header-key">{{ key }}:</span>
                <span class="header-value">{{ value }}</span>
              </div>
            </div>
            <div v-else class="empty-content">无响应头信息</div>
          </div>
        </el-tab-pane>

        <!-- 请求体 -->
        <el-tab-pane label="请求体" name="requestBody">
          <div class="body-section">
            <div class="section-actions">
              <el-button
                size="small"
                @click="copyText(request.requestBody || '')"
                :disabled="!request.requestBody"
              >
                <el-icon><CopyDocument /></el-icon>
                复制请求体
              </el-button>
            </div>
            <div v-if="request.requestBody" class="body-content">
              <pre>{{ formatJsonIfPossible(request.requestBody) }}</pre>
            </div>
            <div v-else class="empty-content">无请求体</div>
          </div>
        </el-tab-pane>

        <!-- 响应体 -->
        <el-tab-pane label="响应体" name="responseBody">
          <div class="body-section">
            <div class="section-actions">
              <el-button
                size="small"
                @click="$emit('copy-response', request.responseBody || '')"
                :disabled="!request.responseBody"
              >
                <el-icon><CopyDocument /></el-icon>
                复制响应体
              </el-button>
            </div>
            <div v-if="request.responseBody" class="body-content">
              <pre>{{ formatJsonIfPossible(request.responseBody) }}</pre>
            </div>
            <div v-else class="empty-content">无响应体</div>
          </div>
        </el-tab-pane>

        <!-- CURL命令 -->
        <el-tab-pane label="CURL" name="curl">
          <div class="curl-section">
            <div class="section-actions">
              <el-button
                size="small"
                type="success"
                @click="$emit('send-curl', curlCommand)"
                :loading="sendingRequest"
              >
                <el-icon><VideoPlay /></el-icon>
                发送请求
              </el-button>
              <el-button size="small" @click="$emit('copy-curl', curlCommand)">
                <el-icon><CopyDocument /></el-icon>
                复制CURL命令
              </el-button>
            </div>
            <div class="curl-content">
              <pre>{{ curlCommand }}</pre>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, VideoPlay } from '@element-plus/icons-vue'

import type { NetworkRequest } from '@/types'
import { formatTimestamp, formatDuration, generateCurl, formatJson, copyToClipboard } from '@/utils'

// Props
interface Props {
  modelValue: boolean
  request: NetworkRequest | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'copy-curl': [curl: string]
  'copy-response': [response: string]
  'send-curl': [curl: string]
}>()

// 响应式数据
const visible = ref(false)
const activeTab = ref('requestHeaders')
const sendingRequest = ref(false)

// 计算属性
const curlCommand = computed(() => {
  if (!props.request) return ''
  return generateCurl(props.request)
})

// 监听器
watch(() => props.modelValue, (newValue) => {
  visible.value = newValue
  if (newValue) {
    activeTab.value = 'requestHeaders'
  }
})

watch(visible, (newValue) => {
  emit('update:modelValue', newValue)
})

// 方法
const handleClose = () => {
  visible.value = false
}

const getMethodTagType = (method: string) => {
  const types: Record<string, string> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info',
    HEAD: 'info',
    OPTIONS: 'info'
  }
  return types[method] || 'info'
}

const formatJsonIfPossible = (text: string): string => {
  try {
    return formatJson(text)
  } catch {
    return text
  }
}

const copyText = async (text: string) => {
  const success = await copyToClipboard(text)
  if (success) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.error('复制失败')
  }
}

const copyHeaders = async (headers: Record<string, string>) => {
  const headersText = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  const success = await copyToClipboard(headersText)
  if (success) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.error('复制失败')
  }
}
</script>

<style lang="scss" scoped>
.request-detail-dialog {
  :deep(.el-dialog) {
    max-height: 85vh;
    min-height: 500px;
    margin: auto;
    display: flex;
    flex-direction: column;

    .el-dialog__body {
      padding: 20px;
      max-height: 70vh;
      min-height: 400px;
      overflow-y: auto;
      flex: 1;
    }
  }

  // 确保弹窗在popup环境中正确显示
  :deep(.el-overlay) {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 2000 !important;
  }

  // 在popup环境中的特殊处理
  :deep(.el-dialog__wrapper) {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
}

.request-detail {
  .basic-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 6px;

    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .label {
        font-weight: 500;
        color: #606266;
        min-width: 80px;
      }

      .value {
        color: #303133;
      }
    }
  }

  .section {
    margin-bottom: 20px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }
    }

    .url-display {
      padding: 12px;
      background: #f5f7fa;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      color: #303133;
      word-break: break-all;
      border: 1px solid #ebeef5;
    }
  }

  .detail-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 16px;
    }

    :deep(.el-tabs__content) {
      padding: 0;
    }
  }

  .headers-section,
  .body-section,
  .curl-section {
    .section-actions {
      margin-bottom: 12px;
      text-align: right;
    }

    .headers-list {
      border: 1px solid #ebeef5;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;

      .header-item {
        display: flex;
        padding: 8px 12px;
        border-bottom: 1px solid #f5f7fa;

        &:last-child {
          border-bottom: none;
        }

        .header-key {
          font-weight: 500;
          color: #409eff;
          min-width: 150px;
          margin-right: 12px;
        }

        .header-value {
          flex: 1;
          color: #303133;
          word-break: break-all;
        }
      }
    }

    .body-content,
    .curl-content {
      border: 1px solid #ebeef5;
      border-radius: 4px;
      max-height: 400px;
      overflow: auto;

      pre {
        margin: 0;
        padding: 16px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.5;
        color: #303133;
        background: #fafafa;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }

    .empty-content {
      text-align: center;
      padding: 40px;
      color: #909399;
      font-size: 14px;
    }
  }
}

// 滚动条样式
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;

  &:hover {
    background: #909399;
  }
}
</style>
