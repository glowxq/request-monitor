<template>
  <el-dialog
    v-model="visible"
    title=""
    width="480px"
    :before-close="handleClose"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    append-to-body
    class="contact-dialog"
    :show-close="false"
    :destroy-on-close="false"
    :modal="true"
    :lock-scroll="false"
  >
    <div class="contact-content">
      <!-- 关闭按钮 -->
      <el-button
        class="close-btn"
        size="small"
        text
        @click="handleClose"
        :icon="Close"
      />

      <!-- 萤火虫动画背景 -->
      <div class="firefly-container">
        <div class="firefly" v-for="i in 8" :key="i" :style="getFireflyStyle(i)"></div>
      </div>

      <!-- 主要内容 -->
      <div class="main-content">
        <!-- 萤火虫SVG图标 -->
        <div class="firefly-icon">
          <svg width="80" height="80" viewBox="0 0 100 100" class="firefly-svg">
            <!-- 萤火虫身体 -->
            <ellipse cx="50" cy="60" rx="8" ry="20" fill="#2d3748" class="firefly-body"/>

            <!-- 萤火虫头部 -->
            <circle cx="50" cy="35" r="12" fill="#4a5568" class="firefly-head"/>

            <!-- 萤火虫眼睛 -->
            <circle cx="46" cy="32" r="2" fill="#ffffff"/>
            <circle cx="54" cy="32" r="2" fill="#ffffff"/>
            <circle cx="46" cy="32" r="1" fill="#000000"/>
            <circle cx="54" cy="32" r="1" fill="#000000"/>

            <!-- 萤火虫触角 -->
            <line x1="45" y1="25" x2="42" y2="20" stroke="#4a5568" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="55" y1="25" x2="58" y2="20" stroke="#4a5568" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="42" cy="20" r="1.5" fill="#4a5568"/>
            <circle cx="58" cy="20" r="1.5" fill="#4a5568"/>

            <!-- 萤火虫翅膀 -->
            <ellipse cx="40" cy="45" rx="12" ry="6" fill="#e2e8f0" opacity="0.7" class="wing-left"/>
            <ellipse cx="60" cy="45" rx="12" ry="6" fill="#e2e8f0" opacity="0.7" class="wing-right"/>

            <!-- 萤火虫发光部分 -->
            <ellipse cx="50" cy="70" rx="6" ry="8" fill="#fbbf24" class="glow-body">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
            </ellipse>

            <!-- 发光效果 -->
            <ellipse cx="50" cy="70" rx="10" ry="12" fill="#fbbf24" opacity="0.3" class="glow-outer">
              <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="50" cy="70" rx="15" ry="18" fill="#fbbf24" opacity="0.1" class="glow-far">
              <animate attributeName="opacity" values="0.05;0.2;0.05" dur="2s" repeatCount="indefinite"/>
            </ellipse>
          </svg>
        </div>

        <!-- 标题 -->
        <h3 class="contact-title">联系开发者</h3>

        <!-- 描述 -->
        <p class="contact-desc">
          如果您在使用过程中遇到问题，或有功能建议，欢迎联系我！
        </p>

        <!-- 微信信息 -->
        <div class="wechat-info">
          <div class="wechat-label">
            <el-icon class="wechat-icon"><ChatDotRound /></el-icon>
            <span>微信号</span>
          </div>
          <div class="wechat-id-container">
            <span class="wechat-id">glowxq</span>
            <el-button
              size="small"
              type="primary"
              :icon="CopyDocument"
              @click="copyWechatId"
              class="copy-btn"
            >
              复制
            </el-button>
          </div>
        </div>

        <!-- 额外信息 -->
        <div class="extra-info">
          <p class="tip">
            <el-icon><InfoFilled /></el-icon>
            添加微信时请备注：网络监听器
          </p>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Close,
  ChatDotRound,
  CopyDocument,
  InfoFilled
} from '@element-plus/icons-vue'
import { copyToClipboard } from '@/utils'

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const handleClose = () => {
  visible.value = false
}

const copyWechatId = async () => {
  const success = await copyToClipboard('glowxq')
  if (success) {
    ElMessage.success('微信号已复制到剪贴板')
  } else {
    ElMessage.error('复制失败，请手动复制：glowxq')
  }
}

// 生成萤火虫样式
const getFireflyStyle = (index: number) => {
  const positions = [
    { left: '10%', top: '20%', delay: '0s' },
    { left: '80%', top: '15%', delay: '0.5s' },
    { left: '15%', top: '70%', delay: '1s' },
    { left: '85%', top: '75%', delay: '1.5s' },
    { left: '30%', top: '10%', delay: '2s' },
    { left: '70%', top: '85%', delay: '2.5s' },
    { left: '5%', top: '50%', delay: '3s' },
    { left: '90%', top: '45%', delay: '3.5s' }
  ]

  const pos = positions[index - 1] || positions[0]

  return {
    left: pos.left,
    top: pos.top,
    animationDelay: pos.delay
  }
}
</script>

<style lang="scss" scoped>
.contact-dialog {
  :deep(.el-dialog) {
    background: linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #1a202c 100%);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    min-height: 500px;
    max-height: 80vh;
    margin: auto;
  }

  :deep(.el-dialog__header) {
    display: none;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    height: auto;
    min-height: 500px;
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

.contact-content {
  position: relative;
  padding: 40px 30px;
  min-height: 500px;
  height: auto;
  color: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .close-btn {
    position: absolute;
    top: 15px;
    right: 15px;
    z-index: 10;
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;

    &:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

// 萤火虫动画背景
.firefly-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;

  .firefly {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #fbbf24;
    border-radius: 50%;
    box-shadow: 0 0 10px #fbbf24, 0 0 20px #fbbf24, 0 0 30px #fbbf24;
    animation: firefly-float 4s ease-in-out infinite;
    opacity: 0;

    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      width: 8px;
      height: 8px;
      background: radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%);
      border-radius: 50%;
    }
  }
}

@keyframes firefly-float {
  0%, 100% {
    opacity: 0;
    transform: translateY(0px) translateX(0px) scale(0.5);
  }
  10% {
    opacity: 1;
    transform: translateY(-10px) translateX(5px) scale(1);
  }
  20% {
    opacity: 0.8;
    transform: translateY(-20px) translateX(-5px) scale(0.8);
  }
  30% {
    opacity: 1;
    transform: translateY(-15px) translateX(10px) scale(1.2);
  }
  50% {
    opacity: 0.6;
    transform: translateY(-25px) translateX(-10px) scale(0.9);
  }
  70% {
    opacity: 1;
    transform: translateY(-10px) translateX(8px) scale(1.1);
  }
  90% {
    opacity: 0.4;
    transform: translateY(-5px) translateX(-3px) scale(0.7);
  }
}

// 主要内容
.main-content {
  position: relative;
  z-index: 2;
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 400px;

  .firefly-icon {
    margin-bottom: 20px;

    .firefly-svg {
      filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.3));

      .wing-left, .wing-right {
        animation: wing-flutter 0.3s ease-in-out infinite alternate;
      }

      .wing-right {
        animation-delay: 0.15s;
      }
    }
  }

  .contact-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 15px 0;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .contact-desc {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 30px 0;
    line-height: 1.6;
  }

  .wechat-info {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);

    .wechat-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 600;
      color: #10b981;

      .wechat-icon {
        font-size: 20px;
      }
    }

    .wechat-id-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;

      .wechat-id {
        font-size: 20px;
        font-weight: 700;
        color: #fbbf24;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background: rgba(251, 191, 36, 0.1);
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      .copy-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }
  }

  .extra-info {
    .tip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;

      .el-icon {
        font-size: 14px;
        color: #fbbf24;
      }
    }
  }
}

@keyframes wing-flutter {
  from {
    transform: rotate(-2deg);
  }
  to {
    transform: rotate(2deg);
  }
}
</style>
