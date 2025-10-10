<template>
  <div class="export-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><Download /></el-icon>
          数据导出
        </h1>
        <div class="page-subtitle">导出请求数据和配置信息，支持多种格式</div>
      </div>
      <div class="header-right">
        <div class="export-stats">
          <div class="stat-item">
            <span class="stat-value">{{ requests.length }}</span>
            <span class="stat-label">总请求数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ errorCount }}</span>
            <span class="stat-label">错误请求</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出选项 -->
    <div class="export-options">
      <div class="option-section">
        <div class="section-title">
          <el-icon><DocumentCopy /></el-icon>
          导出格式
        </div>
        <div class="format-options">
          <el-radio-group v-model="exportFormat" class="format-group">
            <el-radio-button label="json">JSON格式</el-radio-button>
            <el-radio-button label="csv">CSV格式</el-radio-button>
            <el-radio-button label="excel">Excel格式</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="option-section">
        <div class="section-title">
          <el-icon><Filter /></el-icon>
          导出内容
        </div>
        <div class="content-options">
          <el-checkbox-group v-model="exportContent" class="content-group">
            <el-checkbox label="requests">请求记录</el-checkbox>
            <el-checkbox label="config">配置信息</el-checkbox>
            <el-checkbox label="statistics">统计数据</el-checkbox>
          </el-checkbox-group>
        </div>
      </div>

      <div class="option-section">
        <div class="section-title">
          <el-icon><Calendar /></el-icon>
          时间范围
        </div>
        <div class="time-options">
          <el-radio-group v-model="timeRange" class="time-group">
            <el-radio-button label="all">全部时间</el-radio-button>
            <el-radio-button label="today">今天</el-radio-button>
            <el-radio-button label="week">最近一周</el-radio-button>
            <el-radio-button label="custom">自定义</el-radio-button>
          </el-radio-group>

          <div v-if="timeRange === 'custom'" class="custom-time">
            <el-date-picker
              v-model="customTimeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </div>
        </div>
      </div>

      <div class="option-section">
        <div class="section-title">
          <el-icon><Setting /></el-icon>
          导出设置
        </div>
        <div class="export-settings">
          <el-checkbox v-model="includeHeaders">包含请求头</el-checkbox>
          <el-checkbox v-model="includeBody">包含请求体</el-checkbox>
          <el-checkbox v-model="includeResponse">包含响应内容</el-checkbox>
          <el-checkbox v-model="onlyErrors">仅导出错误请求</el-checkbox>
        </div>
      </div>
    </div>

    <!-- 预览区域 -->
    <div class="preview-section">
      <div class="section-header">
        <div class="section-title">
          <el-icon><View /></el-icon>
          导出预览
        </div>
        <div class="preview-info">
          将导出 <strong>{{ filteredRequests.length }}</strong> 条记录
        </div>
      </div>

      <div class="preview-content">
        <div v-if="filteredRequests.length > 0" class="preview-list">
          <div
            v-for="request in previewRequests"
            :key="request.id"
            class="preview-item"
          >
            <div class="item-header">
              <span class="method" :class="request.method.toLowerCase()">
                {{ request.method }}
              </span>
              <span class="status" :class="getStatusClass(request.status)">
                {{ request.status }}
              </span>
              <span class="time">{{ formatTime(request.timestamp) }}</span>
            </div>
            <div class="item-url">{{ request.url }}</div>
          </div>

          <div v-if="filteredRequests.length > 5" class="more-items">
            还有 {{ filteredRequests.length - 5 }} 条记录...
          </div>
        </div>

        <div v-else class="empty-preview">
          <el-icon><DocumentRemove /></el-icon>
          <p>没有符合条件的请求记录</p>
        </div>
      </div>
    </div>

    <!-- 导出按钮 -->
    <div class="export-actions">
      <el-button
        type="primary"
        size="large"
        @click="handleExport"
        :disabled="filteredRequests.length === 0"
        :loading="exporting"
        class="export-btn"
      >
        <el-icon><Download /></el-icon>
        导出数据 ({{ filteredRequests.length }} 条)
      </el-button>

      <el-button
        size="large"
        @click="previewData"
        :disabled="filteredRequests.length === 0"
        class="preview-btn"
      >
        <el-icon><View /></el-icon>
        预览完整数据
      </el-button>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="showPreviewDialog"
      title="数据预览"
      width="80%"
      :show-close="true"
    >
      <div class="data-preview">
        <pre>{{ previewDataContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="showPreviewDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyPreviewData">复制数据</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download,
  DocumentCopy,
  Filter,
  Calendar,
  Setting,
  View,
  DocumentRemove
} from '@element-plus/icons-vue'

// 导入工具函数
import { formatTime, copyToClipboard } from '@/utils'

// 导入类型
import type { NetworkRequest } from '@/types'

// Props
interface Props {
  requests: NetworkRequest[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'export-data': []
}>()

// 响应式数据
const exportFormat = ref<'json' | 'csv' | 'excel'>('json')
const exportContent = ref(['requests', 'config', 'statistics'])
const timeRange = ref<'all' | 'today' | 'week' | 'custom'>('all')
const customTimeRange = ref<[string, string]>(['', ''])
const includeHeaders = ref(true)
const includeBody = ref(false)
const includeResponse = ref(false)
const onlyErrors = ref(false)
const exporting = ref(false)
const showPreviewDialog = ref(false)
const previewDataContent = ref('')

// 计算属性
const errorCount = computed(() =>
  props.requests.filter(req => req.status >= 400 || req.hasValidationError).length
)

const filteredRequests = computed(() => {
  let filtered = props.requests

  // 根据时间范围过滤
  if (timeRange.value !== 'all') {
    const now = new Date()
    let startTime: Date

    if (timeRange.value === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (timeRange.value === 'week') {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeRange.value === 'custom' && customTimeRange.value[0]) {
      startTime = new Date(customTimeRange.value[0])
      const endTime = new Date(customTimeRange.value[1] || now.toISOString())
      filtered = filtered.filter(req => {
        const reqTime = new Date(req.timestamp)
        return reqTime >= startTime && reqTime <= endTime
      })
      return filtered
    } else {
      return filtered
    }

    filtered = filtered.filter(req => new Date(req.timestamp) >= startTime)
  }

  // 仅导出错误请求
  if (onlyErrors.value) {
    filtered = filtered.filter(req => req.status >= 400 || req.hasValidationError)
  }

  return filtered
})

const previewRequests = computed(() => filteredRequests.value.slice(0, 5))

// 方法
const getStatusClass = (status: number) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'error'
  return 'info'
}

const handleExport = async () => {
  exporting.value = true
  try {
    // 准备导出数据
    const exportData: any = {}

    if (exportContent.value.includes('requests')) {
      exportData.requests = filteredRequests.value.map(req => ({
        id: req.id,
        url: req.url,
        method: req.method,
        status: req.status,
        timestamp: req.timestamp,
        duration: req.duration,
        ...(includeHeaders.value && { headers: req.headers }),
        ...(includeBody.value && { requestBody: req.requestBody }),
        ...(includeResponse.value && { responseBody: req.responseBody })
      }))
    }

    if (exportContent.value.includes('statistics')) {
      exportData.statistics = {
        totalRequests: filteredRequests.value.length,
        successRequests: filteredRequests.value.filter(req => req.status >= 200 && req.status < 400).length,
        errorRequests: filteredRequests.value.filter(req => req.status >= 400).length,
        validationErrors: filteredRequests.value.filter(req => req.hasValidationError).length,
        exportTime: new Date().toISOString(),
        timeRange: timeRange.value,
        ...(timeRange.value === 'custom' && { customTimeRange: customTimeRange.value })
      }
    }

    // 根据格式导出
    if (exportFormat.value === 'json') {
      const dataStr = JSON.stringify(exportData, null, 2)
      downloadFile(dataStr, 'application/json', 'json')
    } else if (exportFormat.value === 'csv') {
      const csvData = convertToCSV(exportData.requests || [])
      downloadFile(csvData, 'text/csv', 'csv')
    } else if (exportFormat.value === 'excel') {
      // Excel导出逻辑（简化版）
      const csvData = convertToCSV(exportData.requests || [])
      downloadFile(csvData, 'application/vnd.ms-excel', 'xls')
    }

    ElMessage.success('数据导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + error)
  } finally {
    exporting.value = false
  }
}

const convertToCSV = (data: any[]) => {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      }).join(',')
    )
  ].join('\n')

  return csvContent
}

const downloadFile = (content: string, mimeType: string, extension: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `network-requests-${new Date().toISOString().split('T')[0]}.${extension}`
  a.click()
  URL.revokeObjectURL(url)
}

const previewData = () => {
  const exportData: any = {}

  if (exportContent.value.includes('requests')) {
    exportData.requests = filteredRequests.value.slice(0, 10) // 只预览前10条
  }

  if (exportContent.value.includes('statistics')) {
    exportData.statistics = {
      totalRequests: filteredRequests.value.length,
      successRequests: filteredRequests.value.filter(req => req.status >= 200 && req.status < 400).length,
      errorRequests: filteredRequests.value.filter(req => req.status >= 400).length,
      validationErrors: filteredRequests.value.filter(req => req.hasValidationError).length
    }
  }

  previewDataContent.value = JSON.stringify(exportData, null, 2)
  showPreviewDialog.value = true
}

const copyPreviewData = async () => {
  await copyToClipboard(previewDataContent.value)
  ElMessage.success('数据已复制到剪贴板')
}
</script>

<style lang="scss" scoped>
.export-page {
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
      .export-stats {
        display: flex;
        gap: 20px;

        .stat-item {
          text-align: center;

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
        }
      }
    }
  }

  .export-options {
    margin: 0 16px 16px 16px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 20px 24px;

    .option-section {
      margin-bottom: 24px;

      &:last-child {
        margin-bottom: 0;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: #1d1d1f;
        margin-bottom: 12px;

        .el-icon {
          font-size: 18px;
          color: #0ea5e9;
        }
      }

      .format-options, .content-options, .time-options, .export-settings {
        .format-group, .content-group, .time-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .custom-time {
          margin-top: 12px;
        }

        .export-settings {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;

          .el-checkbox {
            margin: 0;
          }
        }
      }
    }
  }

  .preview-section {
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

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: #1d1d1f;

        .el-icon {
          font-size: 18px;
          color: #0ea5e9;
        }
      }

      .preview-info {
        font-size: 14px;
        color: #86868b;

        strong {
          color: #1d1d1f;
          font-weight: 600;
        }
      }
    }

    .preview-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;

      .preview-list {
        .preview-item {
          padding: 12px 16px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          .item-header {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 6px;

            .method {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;

              &.get { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
              &.post { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
              &.put { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
              &.delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            }

            .status {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;

              &.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
              &.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
              &.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            }

            .time {
              font-size: 11px;
              color: #86868b;
              margin-left: auto;
            }
          }

          .item-url {
            font-size: 13px;
            color: #1d1d1f;
            word-break: break-all;
          }
        }

        .more-items {
          text-align: center;
          padding: 16px;
          color: #86868b;
          font-size: 13px;
          font-style: italic;
        }
      }

      .empty-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #86868b;

        .el-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        p {
          margin: 0;
          font-size: 14px;
        }
      }
    }
  }

  .export-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 16px;
    margin: 0 16px 16px 16px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .export-btn, .preview-btn {
      padding: 12px 24px;
      font-weight: 600;
    }
  }

  .data-preview {
    max-height: 400px;
    overflow-y: auto;
    background: #f8fafc;
    border-radius: 8px;
    padding: 16px;

    pre {
      margin: 0;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #1d1d1f;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
}
</style>
