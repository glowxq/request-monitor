<template>
  <div class="config-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><Setting /></el-icon>
          配置管理
        </h1>
        <div class="page-subtitle">管理API监听配置、URL重定向规则和验证规则</div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="importConfig">
          <el-icon><Upload /></el-icon>
          导入配置
        </el-button>
        <el-button @click="exportConfig">
          <el-icon><Download /></el-icon>
          导出配置
        </el-button>
      </div>
    </div>

    <!-- 配置内容 -->
    <div class="config-content">
      <!-- API前缀配置 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><Link /></el-icon>
            API前缀配置
          </div>
          <div class="section-description">
            配置需要监听的API域名或前缀，支持通配符
          </div>
        </div>
        <div class="section-content">
          <div class="prefix-list">
            <div
              v-for="(prefix, index) in localConfig.apiPrefixes"
              :key="index"
              class="prefix-item"
            >
              <el-input
                v-model="localConfig.apiPrefixes[index]"
                placeholder="例如: *.example.com 或 https://api.example.com"
                @change="updateConfig"
              />
              <el-button
                type="danger"
                text
                @click="removePrefix(index)"
                :icon="Delete"
              />
            </div>
          </div>
          <el-button
            type="primary"
            text
            @click="addPrefix"
            :icon="Plus"
            class="add-btn"
          >
            添加API前缀
          </el-button>
        </div>
      </div>

      <!-- 监听选项 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><Monitor /></el-icon>
            监听选项
          </div>
        </div>
        <div class="section-content">
          <div class="option-grid">
            <div class="option-item">
              <el-switch
                v-model="localConfig.includeSuccessRequests"
                @change="updateConfig"
              />
              <div class="option-info">
                <div class="option-label">记录成功请求</div>
                <div class="option-desc">是否记录状态码为2xx的成功请求</div>
              </div>
            </div>

            <div class="option-item">
              <el-switch
                v-model="localConfig.onlyRecordFetchXHR"
                @change="updateConfig"
              />
              <div class="option-info">
                <div class="option-label">仅记录Fetch/XHR</div>
                <div class="option-desc">只记录通过Fetch API和XMLHttpRequest发起的请求</div>
              </div>
            </div>

            <div class="option-item">
              <el-switch
                v-model="localConfig.enableConsoleLog"
                @change="updateConfig"
              />
              <div class="option-info">
                <div class="option-label">控制台输出</div>
                <div class="option-desc">在浏览器控制台输出请求日志</div>
              </div>
            </div>

            <div class="option-item">
              <el-switch
                v-model="localConfig.autoExport"
                @change="updateConfig"
              />
              <div class="option-info">
                <div class="option-label">自动导出</div>
                <div class="option-desc">达到最大记录数时自动导出数据</div>
              </div>
            </div>

            <div class="option-item">
              <el-switch
                v-model="localConfig.enableFloatingSidebar"
                @change="updateConfig"
              />
              <div class="option-info">
                <div class="option-label">浮动侧边栏</div>
                <div class="option-desc">在所有网页上显示常驻的浮动侧边栏</div>
              </div>
            </div>
          </div>

          <div class="number-options">
            <div class="number-option">
              <label class="option-label">最大记录数</label>
              <el-input-number
                v-model="localConfig.maxRecords"
                :min="10"
                :max="10000"
                :step="10"
                @change="updateConfig"
                class="number-input"
              />
            </div>
          </div>

          <!-- 浮动侧边栏配置 -->
          <div v-if="localConfig.enableFloatingSidebar" class="floating-sidebar-config">
            <div class="config-title">浮动侧边栏设置</div>
            <div class="sidebar-options">
              <div class="sidebar-option">
                <label class="option-label">侧边栏位置</label>
                <el-radio-group v-model="localConfig.sidebarPosition" @change="updateConfig">
                  <el-radio-button label="left">左侧</el-radio-button>
                  <el-radio-button label="right">右侧</el-radio-button>
                </el-radio-group>
              </div>

              <div class="sidebar-option">
                <label class="option-label">透明度: {{ Math.round((localConfig.sidebarOpacity || 0.95) * 100) }}%</label>
                <el-slider
                  v-model="localConfig.sidebarOpacity"
                  :min="0.5"
                  :max="1.0"
                  :step="0.05"
                  @change="updateConfig"
                  class="opacity-slider"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- URL重定向规则 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><Switch /></el-icon>
            URL重定向规则
          </div>
          <div class="section-description">
            配置URL重定向规则，将生产环境API重定向到本地开发环境
          </div>
        </div>
        <div class="section-content">
          <div class="rule-list">
            <div
              v-for="(rule, index) in localConfig.urlReplaceRules"
              :key="index"
              class="rule-item"
            >
              <div class="rule-inputs">
                <div class="input-group">
                  <label>源URL</label>
                  <el-input
                    v-model="rule.from"
                    placeholder="https://api.example.com"
                    @change="updateConfig"
                  />
                </div>
                <div class="input-group">
                  <label>目标URL</label>
                  <el-input
                    v-model="rule.to"
                    placeholder="http://localhost:3000"
                    @change="updateConfig"
                  />
                </div>
              </div>
              <div class="rule-actions">
                <el-switch
                  v-model="rule.enabled"
                  @change="updateConfig"
                />
                <el-button
                  type="danger"
                  text
                  @click="removeUrlRule(index)"
                  :icon="Delete"
                />
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            text
            @click="addUrlRule"
            :icon="Plus"
            class="add-btn"
          >
            添加重定向规则
          </el-button>
        </div>
      </div>

      <!-- 响应验证规则 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><DocumentChecked /></el-icon>
            响应验证规则
          </div>
          <div class="section-description">
            配置响应内容验证规则，自动检测异常响应
          </div>
        </div>
        <div class="section-content">
          <div class="validation-list">
            <div
              v-for="(rule, index) in localConfig.responseValidationRules"
              :key="index"
              class="validation-item"
            >
              <div class="validation-inputs">
                <div class="input-group">
                  <label>字段名</label>
                  <el-input
                    v-model="rule.key"
                    placeholder="code"
                    @change="updateConfig"
                  />
                </div>
                <div class="input-group">
                  <label>操作符</label>
                  <el-select
                    v-model="rule.operator"
                    @change="updateConfig"
                  >
                    <el-option label="等于" value="equals" />
                    <el-option label="不等于" value="not_equals" />
                    <el-option label="包含" value="contains" />
                    <el-option label="不包含" value="not_contains" />
                  </el-select>
                </div>
                <div class="input-group">
                  <label>期望值</label>
                  <el-input
                    v-model="rule.expectedValue"
                    placeholder="0"
                    @change="updateConfig"
                  />
                </div>
              </div>
              <div class="validation-actions">
                <el-switch
                  v-model="rule.enabled"
                  @change="updateConfig"
                />
                <el-button
                  type="danger"
                  text
                  @click="removeValidationRule(index)"
                  :icon="Delete"
                />
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            text
            @click="addValidationRule"
            :icon="Plus"
            class="add-btn"
          >
            添加验证规则
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Setting,
  Upload,
  Download,
  Link,
  Monitor,
  Switch,
  DocumentChecked,
  Delete,
  Plus
} from '@element-plus/icons-vue'

// 导入类型
import type { MonitorConfig } from '@/types'

// Props
interface Props {
  config: MonitorConfig
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update-config': [config: Partial<MonitorConfig>]
}>()

// 本地配置副本
const localConfig = ref<MonitorConfig>({ ...props.config })

// 监听props变化
watch(() => props.config, (newConfig) => {
  localConfig.value = { ...newConfig }
}, { deep: true })

// 方法
const updateConfig = () => {
  emit('update-config', localConfig.value)
}

const addPrefix = () => {
  localConfig.value.apiPrefixes.push('')
  updateConfig()
}

const removePrefix = (index: number) => {
  localConfig.value.apiPrefixes.splice(index, 1)
  updateConfig()
}

const addUrlRule = () => {
  localConfig.value.urlReplaceRules.push({
    from: '',
    to: '',
    enabled: true
  })
  updateConfig()
}

const removeUrlRule = (index: number) => {
  localConfig.value.urlReplaceRules.splice(index, 1)
  updateConfig()
}

const addValidationRule = () => {
  localConfig.value.responseValidationRules.push({
    key: '',
    expectedValue: '',
    operator: 'equals',
    enabled: true
  })
  updateConfig()
}

const removeValidationRule = (index: number) => {
  localConfig.value.responseValidationRules.splice(index, 1)
  updateConfig()
}

const exportConfig = () => {
  const configStr = JSON.stringify(localConfig.value, null, 2)
  const blob = new Blob([configStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `network-monitor-config-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

const importConfig = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string)
          localConfig.value = { ...localConfig.value, ...config }
          updateConfig()
          ElMessage.success('配置导入成功')
        } catch (error) {
          ElMessage.error('配置文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}
</script>

<style lang="scss" scoped>
.config-page {
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
      display: flex;
      gap: 12px;
    }
  }

  .config-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px 16px;

    .config-section {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 16px;

      .section-header {
        padding: 20px 24px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #1d1d1f;
          margin-bottom: 4px;

          .el-icon {
            font-size: 20px;
            color: #0ea5e9;
          }
        }

        .section-description {
          font-size: 13px;
          color: #86868b;
          font-weight: 500;
        }
      }

      .section-content {
        padding: 20px 24px;

        .prefix-list, .rule-list, .validation-list {
          .prefix-item, .rule-item, .validation-item {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            padding: 16px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 8px;
            border: 1px solid rgba(0, 0, 0, 0.05);

            &:last-child {
              margin-bottom: 0;
            }
          }

          .prefix-item {
            .el-input {
              flex: 1;
            }
          }

          .rule-item, .validation-item {
            flex-direction: column;
            align-items: stretch;

            .rule-inputs, .validation-inputs {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 12px;

              .input-group {
                label {
                  display: block;
                  font-size: 12px;
                  color: #86868b;
                  font-weight: 600;
                  margin-bottom: 6px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
              }
            }

            .validation-inputs {
              grid-template-columns: 1fr 120px 1fr;
            }

            .rule-actions, .validation-actions {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
          }
        }

        .option-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;

          .option-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 8px;
            border: 1px solid rgba(0, 0, 0, 0.05);

            .option-info {
              .option-label {
                font-size: 14px;
                font-weight: 600;
                color: #1d1d1f;
                margin-bottom: 4px;
              }

              .option-desc {
                font-size: 12px;
                color: #86868b;
                line-height: 1.4;
              }
            }
          }
        }

        .number-options {
          .number-option {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 8px;
            border: 1px solid rgba(0, 0, 0, 0.05);

            .option-label {
              font-size: 14px;
              font-weight: 600;
              color: #1d1d1f;
              min-width: 100px;
            }

            .number-input {
              width: 150px;
            }
          }
        }

        .floating-sidebar-config {
          margin-top: 20px;
          padding: 16px;
          background: rgba(14, 165, 233, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(14, 165, 233, 0.1);

          .config-title {
            font-size: 14px;
            font-weight: 600;
            color: #0ea5e9;
            margin-bottom: 12px;
          }

          .sidebar-options {
            display: flex;
            flex-direction: column;
            gap: 16px;

            .sidebar-option {
              display: flex;
              flex-direction: column;
              gap: 8px;

              .option-label {
                font-size: 13px;
                font-weight: 600;
                color: #1d1d1f;
              }

              .opacity-slider {
                width: 200px;
              }
            }
          }
        }

        .add-btn {
          margin-top: 12px;
          color: #0ea5e9;
          font-weight: 500;

          &:hover {
            background: rgba(14, 165, 233, 0.1);
          }
        }
      }
    }
  }
}
</style>
