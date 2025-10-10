/**
 * 内容脚本 - 简化版本
 * 参考掘金文章的实现方式
 */

// 防止重复注入
if ((window as any).NETWORK_MONITOR_CONTENT_SCRIPT_LOADED) {
  console.log('⚠️ Content Script 已经加载，跳过重复注入')
} else {
  (window as any).NETWORK_MONITOR_CONTENT_SCRIPT_LOADED = true
  console.log('🚀 [CONTENT] Content Script 开始加载...')

// 直接定义需要的类型
interface NetworkRequest {
  id: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  status: number
  statusText: string
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: string
  responseBody?: string
  timestamp: number
  duration: number
  domain: string
  isError: boolean
  errorType?: 'network' | 'timeout' | 'abort' | 'server'
  isValidationError?: boolean
}

// 检查Chrome API是否可用
if (typeof chrome === 'undefined' || !chrome.runtime) {
  console.error('❌ Chrome API不可用，Content Script无法正常工作')
} else {
  console.log('✅ [CONTENT] Chrome API可用，继续初始化...')
}

// 全局变量
let monitoringApiPrefixes: string[] = []
let isContentScriptActive = false
let pageScriptInjected = false  // 标记页面脚本是否已注入

// 检查当前域名是否匹配配置
function matchesDomainConfig(currentDomain: string, configuredDomains: string[]): boolean {
  if (!currentDomain || !configuredDomains || configuredDomains.length === 0) {
    return false
  }

  // 清理当前域名，移除协议和端口
  const cleanCurrentDomain = currentDomain.replace(/^https?:\/\//, '').split(':')[0]

  return configuredDomains.some(configDomain => {
    // 清理配置的域名
    const cleanConfigDomain = configDomain.replace(/^https?:\/\//, '').split(':')[0]

    // 支持通配符匹配
    if (cleanConfigDomain.startsWith('*.')) {
      const wildcardDomain = cleanConfigDomain.substring(2)
      return cleanCurrentDomain.endsWith(wildcardDomain)
    }

    // 精确匹配
    return cleanCurrentDomain === cleanConfigDomain
  })
}

// 检查是否应该在当前域名注入页面脚本
function shouldInjectPageScript(domainConfig: any): boolean {
  if (!domainConfig || !domainConfig.enabled) {
    return false  // 如果未启用域名限制，不注入
  }

  try {
    const currentDomain = window.location.hostname
    return matchesDomainConfig(currentDomain, domainConfig.domains || [])
  } catch {
    return false
  }
}

// 注入页面脚本（只在匹配域名时）
function injectPageScript() {
  if (pageScriptInjected) {
    console.log('📋 [CONTENT] 页面脚本已注入，跳过')
    return
  }

  // 从storage中获取域名配置
  chrome.storage.local.get(['config'], (result) => {
    const storedConfig = result.config || {}
    const domainConfig = storedConfig.domainConfig

    if (!shouldInjectPageScript(domainConfig)) {
      console.log('⏭️ [CONTENT] 当前域名不匹配，跳过页面脚本注入')
      return
    }

    try {
      const script = document.createElement('script')
      script.src = chrome.runtime.getURL('inject-fixed.js')
      script.onload = function() {
        console.log('✅ [CONTENT] 修复版页面脚本注入成功')
        script.remove()
        pageScriptInjected = true
        // 注入成功后发送初始配置
        setTimeout(() => {
          sendConfigToPageScript()
        }, 100) // 延迟一点确保脚本完全加载
      }
      script.onerror = function() {
        console.error('❌ [CONTENT] 修复版页面脚本注入失败')
      }

      // 注入到页面
      ;(document.head || document.documentElement).appendChild(script)
      console.log('📤 [CONTENT] 正在注入修复版页面脚本...')
    } catch (error) {
      console.error('❌ [CONTENT] 注入页面脚本时出错:', error)
    }
  })
}

// 发送配置到页面脚本
function sendConfigToPageScript() {
  // 从storage中获取完整配置
  chrome.storage.local.get(['config'], (result) => {
    const storedConfig = result.config || {}

    const config = {
      enabled: isContentScriptActive,
      apiPrefixes: monitoringApiPrefixes,
      enableConsoleLog: storedConfig.enableConsoleLog !== undefined ? storedConfig.enableConsoleLog : false,
      validationRules: [],
      domainConfig: storedConfig.domainConfig || {
        enabled: true,  // 默认启用域名限制
        domains: []
      }
    }

    // 总是输出配置信息，便于调试
    console.log('📤 [CONTENT] 发送配置到页面脚本:', {
      enabled: config.enabled,
      apiPrefixesCount: config.apiPrefixes.length,
      apiPrefixes: config.apiPrefixes,
      enableConsoleLog: config.enableConsoleLog,
      domainConfig: config.domainConfig,
      currentDomain: window.location.hostname
    })

    window.postMessage({
      type: 'NETWORK_MONITOR_CONFIG',
      source: 'network-monitor-content-script',
      data: config
    }, '*')
  })
}

// 监听来自页面脚本的消息
window.addEventListener('message', function(event) {
  if (event.source !== window) return

  const { type, source, data } = event.data
  if (type === 'NETWORK_REQUEST_INTERCEPTED' && source === 'network-monitor-fixed') {
    console.log('📨 [CONTENT] 收到优化版页面脚本的请求数据:', {
      url: data.url,
      method: data.method,
      status: data.status,
      responseBodyLength: data.responseBody ? data.responseBody.length : 0,
      responseBodyPreview: data.responseBody ? data.responseBody.substring(0, 100) : '[无响应体]'
    })

    // 转发到background script
    try {
      chrome.runtime.sendMessage({
        type: 'NETWORK_REQUEST_INTERCEPTED',
        payload: data
      }).then(() => {
        console.log('✅ [CONTENT] 成功转发到background script')
      }).catch((error) => {
        console.error('❌ [CONTENT] 转发到background script失败:', error)
      })
    } catch (error) {
      console.error('❌ [CONTENT] 发送消息失败:', error)
    }
  }
})

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 [CONTENT] 收到background消息:', message)

  if (message.type === 'UPDATE_MONITORING_API_PREFIXES') {
    monitoringApiPrefixes = message.payload || []
    isContentScriptActive = true
    console.log('🔄 [CONTENT] 更新监听API前缀列表:', monitoringApiPrefixes)
    console.log('✅ [CONTENT] Content Script 已激活')

    // 只有在页面脚本已注入时才发送配置
    if (pageScriptInjected) {
      sendConfigToPageScript()
    } else {
      // 如果页面脚本未注入，尝试注入
      injectPageScript()
    }

    sendResponse({ success: true })
  } else if (message.type === 'PING') {
    // 响应ping消息
    sendResponse({ success: true, active: isContentScriptActive })
  } else if (message.type === 'STOP_MONITORING') {
    // 停止监听，通知页面脚本恢复原始方法
    isContentScriptActive = false
    monitoringApiPrefixes = []

    if (pageScriptInjected) {
      // 发送停止配置到页面脚本
      window.postMessage({
        type: 'NETWORK_MONITOR_CONFIG',
        source: 'network-monitor-content-script',
        data: {
          enabled: false,
          apiPrefixes: [],
          enableConsoleLog: false,
          domainConfig: {
            enabled: true,
            domains: []
          }
        }
      }, '*')

      console.log('🛑 [CONTENT] 已通知页面脚本停止监听')
    }

    sendResponse({ success: true })
  } else if (message.type === 'MONITORING_STATUS_CHANGED') {
    // 更新浮动侧边栏状态
    const statusDot = document.getElementById('status-dot')
    if (statusDot) {
      statusDot.style.background = message.isActive ? '#22c55e' : '#ef4444'
      if (message.isActive) {
        statusDot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.4)'
      } else {
        statusDot.style.boxShadow = 'none'
      }
    }
  } else if (message.type === 'CONFIG_UPDATED') {
    // 配置更新，可能需要重新创建或销毁浮动侧边栏
    const newConfig = message.config
    if (newConfig.enableFloatingSidebar && !floatingSidebarContainer) {
      createFloatingSidebar()
    } else if (!newConfig.enableFloatingSidebar && floatingSidebarContainer) {
      destroyFloatingSidebar()
    }

    // 处理新悬浮球配置更新
    if (newConfig.enableFloatingBall && !floatingBallContainer) {
      createFloatingBall()
    } else if (!newConfig.enableFloatingBall && floatingBallContainer) {
      destroyFloatingBall()
    }
  } else if (message.type === 'TOGGLE_DEVTOOLS_SIDEBAR') {
    // 切换DevTools侧边栏
    toggleDevToolsSidebar()
  }
})

// 浮动侧边栏相关
let floatingSidebarApp: any = null
let floatingSidebarContainer: HTMLElement | null = null

// 新悬浮球和DevTools侧边栏相关
let floatingBallApp: any = null
let floatingBallContainer: HTMLElement | null = null
let devToolsSidebarApp: any = null
let devToolsSidebarContainer: HTMLElement | null = null

// 创建浮动侧边栏 - 使用原生HTML/CSS/JS实现
async function createFloatingSidebar() {
  // 检查是否启用浮动侧边栏
  const result = await chrome.storage.local.get(['config'])
  const config = result.config || {}

  if (!config.enableFloatingSidebar) {
    console.log('⏭️ [CONTENT] 浮动侧边栏未启用，跳过创建')
    return
  }

  try {
    // 创建容器
    floatingSidebarContainer = document.createElement('div')
    floatingSidebarContainer.id = 'network-monitor-floating-sidebar'
    floatingSidebarContainer.style.cssText = `
      position: fixed;
      top: 100px;
      right: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
      user-select: none;
    `

    // 创建触发按钮
    const triggerButton = document.createElement('div')
    triggerButton.style.cssText = `
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.95);
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
    `

    // 添加图标 - 使用插件logo
    triggerButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#06B6D4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
          </linearGradient>
          <radialGradient id="fireflyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#FBBF24;stop-opacity:1" />
            <stop offset="30%" style="stop-color:#10B981;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#10B981;stop-opacity:0" />
          </radialGradient>
        </defs>
        <!-- 中心主萤火虫 -->
        <g transform="translate(50, 50)">
          <circle cx="0" cy="0" r="12" fill="url(#fireflyGlow)" opacity="0.8"/>
          <ellipse cx="0" cy="0" rx="3" ry="5" fill="#047857"/>
          <circle cx="0" cy="1.5" r="2" fill="#FBBF24" opacity="1"/>
        </g>
        <!-- 左上萤火虫 -->
        <g transform="translate(30, 30)">
          <circle cx="0" cy="0" r="8" fill="url(#fireflyGlow)" opacity="0.6"/>
          <ellipse cx="0" cy="0" rx="2" ry="3" fill="#047857"/>
          <circle cx="0" cy="1" r="1.5" fill="#10B981" opacity="0.9"/>
        </g>
        <!-- 右下萤火虫 -->
        <g transform="translate(70, 70)">
          <circle cx="0" cy="0" r="6" fill="url(#fireflyGlow)" opacity="0.5"/>
          <ellipse cx="0" cy="0" rx="1.5" ry="2.5" fill="#047857"/>
          <circle cx="0" cy="0.8" r="1.2" fill="#06B6D4" opacity="0.8"/>
        </g>
      </svg>
      <div style="position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; transition: all 0.2s ease;" id="status-dot"></div>
    `

    // 添加悬停效果
    triggerButton.addEventListener('mouseenter', () => {
      triggerButton.style.background = 'rgba(255, 255, 255, 0.98)'
      triggerButton.style.transform = 'translateX(-2px)'
      triggerButton.style.boxShadow = '-4px 0 24px rgba(0, 0, 0, 0.15)'
    })

    triggerButton.addEventListener('mouseleave', () => {
      triggerButton.style.background = 'rgba(255, 255, 255, 0.95)'
      triggerButton.style.transform = 'translateX(0)'
      triggerButton.style.boxShadow = '-2px 0 20px rgba(0, 0, 0, 0.1)'
    })

    // 点击打开全屏界面
    triggerButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_FULLSCREEN' })
    })

    floatingSidebarContainer.appendChild(triggerButton)
    document.body.appendChild(floatingSidebarContainer)

    // 监听状态更新
    chrome.runtime.onMessage.addListener((message) => {
      const statusDot = document.getElementById('status-dot')
      if (statusDot) {
        if (message.type === 'MONITORING_STATUS_CHANGED') {
          statusDot.style.background = message.isActive ? '#22c55e' : '#ef4444'
          if (message.isActive) {
            statusDot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.4)'
          } else {
            statusDot.style.boxShadow = 'none'
          }
        }
      }
    })

    console.log('✅ [CONTENT] 浮动侧边栏创建成功')
  } catch (error) {
    console.error('❌ [CONTENT] 创建浮动侧边栏失败:', error)
  }
}

// 销毁浮动侧边栏
function destroyFloatingSidebar() {
  if (floatingSidebarApp) {
    floatingSidebarApp.unmount()
    floatingSidebarApp = null
  }

  if (floatingSidebarContainer) {
    floatingSidebarContainer.remove()
    floatingSidebarContainer = null
  }

  console.log('🗑️ [CONTENT] 浮动侧边栏已销毁')
}

// 创建新悬浮球 - 使用原生HTML/CSS/JS实现
async function createFloatingBall() {
  // 检查是否启用新悬浮球
  const result = await chrome.storage.local.get(['config'])
  const config = result.config || {}

  console.log('🔍 [CONTENT] 检查悬浮球配置:', {
    enableFloatingBall: config.enableFloatingBall,
    currentUrl: window.location.href,
    hostname: window.location.hostname,
    domainConfig: config.domainConfig,
    fullConfig: config
  })

  if (!config.enableFloatingBall) {
    console.log('⏭️ [CONTENT] 新悬浮球未启用，跳过创建')
    return
  }

  console.log('✅ [CONTENT] 悬浮球已启用，继续创建流程')

  // 悬浮球的域名检查逻辑（与content script注入逻辑分离）
  if (config.domainConfig && config.domainConfig.enabled) {
    const currentUrl = window.location.href
    const isLocalFile = currentUrl.startsWith('file://')
    const currentDomain = window.location.hostname

    console.log('🔍 [CONTENT] 域名限制已启用，检查当前域名:', {
      currentUrl,
      currentDomain,
      isLocalFile,
      allowedDomains: config.domainConfig.domains
    })

    // 对于本地文件，如果域名列表包含localhost或*，则允许显示
    if (isLocalFile) {
      const hasLocalhost = config.domainConfig.domains.some(domain =>
        domain === 'localhost' || domain === '127.0.0.1' || domain === '*'
      )
      if (!hasLocalhost) {
        console.log('⏭️ [CONTENT] 本地文件不在允许列表中，跳过创建悬浮球')
        return
      }
      console.log('✅ [CONTENT] 本地文件在允许列表中')
    } else {
      // 检查当前域名是否在允许列表中
      const isAllowed = config.domainConfig.domains.some(domain => {
        if (domain === '*') return true
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2)
          return currentDomain.endsWith(baseDomain)
        }
        return currentDomain === domain
      })

      if (!isAllowed) {
        console.log('⏭️ [CONTENT] 当前域名不在允许列表中，跳过创建悬浮球:', {
          currentDomain,
          allowedDomains: config.domainConfig.domains
        })
        return
      }
      console.log('✅ [CONTENT] 当前域名在允许列表中')
    }
  } else {
    // 如果未启用域名限制，悬浮球可以在所有页面显示
    console.log('✅ [CONTENT] 域名限制未启用，允许在所有页面显示悬浮球')
  }

  try {
    // 检查是否有旧的浮动侧边栏，如果有则调整位置避免重叠
    const hasFloatingSidebar = document.getElementById('network-monitor-floating-sidebar')
    const defaultTop = hasFloatingSidebar ? 200 : 150 // 如果有旧侧边栏，位置更低一些

    // 创建悬浮球容器
    floatingBallContainer = document.createElement('div')
    floatingBallContainer.id = 'network-monitor-floating-ball'
    floatingBallContainer.style.cssText = `
      position: fixed;
      top: ${defaultTop}px;
      right: 8px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      user-select: none;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: floatingBallEntrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
    `

    // 创建主图标
    const ballIcon = document.createElement('div')
    ballIcon.style.cssText = `
      color: #86868b;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    ballIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="iconGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#06B6D4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
          </linearGradient>
          <radialGradient id="fireflyGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#FBBF24;stop-opacity:1" />
            <stop offset="30%" style="stop-color:#10B981;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#10B981;stop-opacity:0" />
          </radialGradient>
        </defs>
        <!-- 中心主萤火虫 -->
        <g transform="translate(50, 50)">
          <circle cx="0" cy="0" r="12" fill="url(#fireflyGlow2)" opacity="0.8"/>
          <ellipse cx="0" cy="0" rx="3" ry="5" fill="#047857"/>
          <circle cx="0" cy="1.5" r="2" fill="#FBBF24" opacity="1"/>
        </g>
        <!-- 左上萤火虫 -->
        <g transform="translate(30, 30)">
          <circle cx="0" cy="0" r="8" fill="url(#fireflyGlow2)" opacity="0.6"/>
          <ellipse cx="0" cy="0" rx="2" ry="3" fill="#047857"/>
          <circle cx="0" cy="1" r="1.5" fill="#10B981" opacity="0.9"/>
        </g>
        <!-- 右下萤火虫 -->
        <g transform="translate(70, 70)">
          <circle cx="0" cy="0" r="6" fill="url(#fireflyGlow2)" opacity="0.5"/>
          <ellipse cx="0" cy="0" rx="1.5" ry="2.5" fill="#047857"/>
          <circle cx="0" cy="0.8" r="1.2" fill="#06B6D4" opacity="0.8"/>
        </g>
      </svg>
    `

    // 创建状态指示器
    const statusDot = document.createElement('div')
    statusDot.id = 'floating-ball-status-dot'
    statusDot.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid white;
      transition: all 0.3s ease;
    `

    // 创建错误计数徽章
    const errorBadge = document.createElement('div')
    errorBadge.id = 'floating-ball-error-badge'
    errorBadge.style.cssText = `
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
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      animation: pulse 2s infinite;
    `

    // 组装悬浮球
    floatingBallContainer.appendChild(ballIcon)
    floatingBallContainer.appendChild(statusDot)
    floatingBallContainer.appendChild(errorBadge)

    // 添加样式动画
    const style = document.createElement('style')
    style.textContent = `
      @keyframes floatingBallEntrance {
        0% {
          transform: scale(0) rotate(180deg);
          opacity: 0;
        }
        50% {
          transform: scale(1.2) rotate(90deg);
          opacity: 0.8;
        }
        100% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
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


    `
    document.head.appendChild(style)

    // 添加交互效果
    let isDragging = false
    let dragStartY = 0
    let ballStartY = 100

    floatingBallContainer.addEventListener('mouseenter', () => {
      if (!isDragging) {
        floatingBallContainer.style.transform = 'scale(1.05)'
        floatingBallContainer.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.2)'
        // 悬停时向左移动一点
        floatingBallContainer.style.right = '32px'
      }
    })

    floatingBallContainer.addEventListener('mouseleave', () => {
      if (!isDragging) {
        floatingBallContainer.style.transform = 'scale(1)'
        floatingBallContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)'
        // 离开时吸附到边界
        floatingBallContainer.style.right = '8px'
      }
    })

    floatingBallContainer.addEventListener('mousedown', (e) => {
      isDragging = false
      dragStartY = e.clientY
      ballStartY = parseInt(floatingBallContainer.style.top) || 100

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging && Math.abs(e.clientY - dragStartY) > 5) {
          isDragging = true
          floatingBallContainer.style.cursor = 'grabbing'
        }

        if (isDragging) {
          const newY = ballStartY + (e.clientY - dragStartY)
          const clampedY = Math.max(20, Math.min(window.innerHeight - 68, newY))
          floatingBallContainer.style.top = clampedY + 'px'
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        setTimeout(() => {
          if (isDragging) {
            // 自动吸附到右侧边界
            floatingBallContainer.style.right = '8px'
            floatingBallContainer.style.left = 'auto'

            // 保存位置
            const currentY = parseInt(floatingBallContainer.style.top) || 100
            chrome.storage.local.set({ floatingBallPosition: { x: 0, y: currentY } })
          }
          isDragging = false
          floatingBallContainer.style.cursor = 'pointer'
        }, 100)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      e.preventDefault()
    })

    // 点击事件
    floatingBallContainer.addEventListener('click', () => {
      if (!isDragging) {
        // 添加简单的点击动画
        floatingBallContainer.style.transform = 'scale(0.95)'
        setTimeout(() => {
          floatingBallContainer.style.transform = 'scale(1)'
        }, 150)

        // 发送消息打开DevTools侧边栏
        chrome.runtime.sendMessage({ type: 'TOGGLE_DEVTOOLS_SIDEBAR' })
      }
    })

    // 添加到页面
    document.body.appendChild(floatingBallContainer)

    // 加载保存的位置
    const positionResult = await chrome.storage.local.get(['floatingBallPosition'])
    if (positionResult.floatingBallPosition) {
      floatingBallContainer.style.top = positionResult.floatingBallPosition.y + 'px'
    } else {
      // 如果没有保存的位置，使用默认位置
      floatingBallContainer.style.top = defaultTop + 'px'
    }

    // 确保始终吸附右侧边界
    floatingBallContainer.style.right = '8px'
    floatingBallContainer.style.left = 'auto'

    // 监听状态更新
    chrome.runtime.onMessage.addListener((message) => {
      if (!floatingBallContainer) return

      const statusDot = document.getElementById('floating-ball-status-dot')
      const errorBadge = document.getElementById('floating-ball-error-badge')
      const ballIcon = floatingBallContainer.querySelector('div')

      switch (message.type) {
        case 'MONITORING_STATUS_CHANGED':
          if (statusDot) {
            statusDot.style.background = message.isActive ? '#22c55e' : '#ef4444'
            if (message.isActive) {
              statusDot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.4)'
            } else {
              statusDot.style.boxShadow = 'none'
            }
          }
          if (ballIcon) {
            ballIcon.style.color = message.isActive ? '#22c55e' : '#86868b'
          }
          break

        case 'REQUEST_STATS_UPDATED':
          if (errorBadge) {
            if (message.errors > 0) {
              errorBadge.style.display = 'flex'
              errorBadge.textContent = message.errors > 99 ? '99+' : message.errors.toString()
            } else {
              errorBadge.style.display = 'none'
            }
          }
          if (ballIcon && message.errors > 0) {
            ballIcon.style.color = '#ef4444'
          }
          break

        case 'CONFIG_UPDATED':
          // 如果配置更新禁用了悬浮球，销毁它
          if (!message.config.enableFloatingBall) {
            destroyFloatingBall()
          }
          break
      }
    })

    // 请求初始状态
    chrome.runtime.sendMessage({ type: 'GET_FLOATING_BALL_STATUS' })

    console.log('✅ [CONTENT] 新悬浮球创建成功')
  } catch (error) {
    console.error('❌ [CONTENT] 创建新悬浮球失败:', error)
  }
}

// 销毁新悬浮球
function destroyFloatingBall() {
  if (floatingBallContainer) {
    // 添加销毁动画
    floatingBallContainer.style.animation = 'floatingBallExit 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'

    // 添加退出动画样式
    const exitStyle = document.createElement('style')
    exitStyle.textContent = `
      @keyframes floatingBallExit {
        0% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: scale(0) rotate(-180deg);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(exitStyle)

    setTimeout(() => {
      if (floatingBallContainer) {
        floatingBallContainer.remove()
        floatingBallContainer = null
      }
      exitStyle.remove()
    }, 400)
  }

  if (floatingBallApp) {
    floatingBallApp.unmount()
    floatingBallApp = null
  }

  console.log('🗑️ [CONTENT] 新悬浮球已销毁')
}

// 强制创建悬浮球（用于调试）
async function forceCreateFloatingBall() {
  console.log('🔧 [CONTENT] 强制创建悬浮球（调试模式）')

  // 先销毁现有的悬浮球
  if (floatingBallContainer) {
    destroyFloatingBall()
  }

  // 跳过所有检查，直接创建悬浮球
  try {
    // 检查是否有旧的浮动侧边栏，如果有则调整位置避免重叠
    const hasFloatingSidebar = document.getElementById('network-monitor-floating-sidebar')
    const defaultTop = hasFloatingSidebar ? 200 : 150

    // 创建悬浮球容器
    floatingBallContainer = document.createElement('div')
    floatingBallContainer.id = 'network-monitor-floating-ball'
    floatingBallContainer.style.cssText = `
      position: fixed;
      top: ${defaultTop}px;
      right: 8px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      user-select: none;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
    `

    // 添加图标 - 使用插件logo
    const icon = document.createElement('div')
    icon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="iconGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#06B6D4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
          </linearGradient>
          <radialGradient id="fireflyGlow3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#FBBF24;stop-opacity:1" />
            <stop offset="30%" style="stop-color:#10B981;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#10B981;stop-opacity:0" />
          </radialGradient>
        </defs>
        <!-- 中心主萤火虫 -->
        <g transform="translate(50, 50)">
          <circle cx="0" cy="0" r="12" fill="url(#fireflyGlow3)" opacity="0.8"/>
          <ellipse cx="0" cy="0" rx="3" ry="5" fill="#047857"/>
          <circle cx="0" cy="1.5" r="2" fill="#FBBF24" opacity="1"/>
        </g>
        <!-- 左上萤火虫 -->
        <g transform="translate(30, 30)">
          <circle cx="0" cy="0" r="8" fill="url(#fireflyGlow3)" opacity="0.6"/>
          <ellipse cx="0" cy="0" rx="2" ry="3" fill="#047857"/>
          <circle cx="0" cy="1" r="1.5" fill="#10B981" opacity="0.9"/>
        </g>
        <!-- 右下萤火虫 -->
        <g transform="translate(70, 70)">
          <circle cx="0" cy="0" r="6" fill="url(#fireflyGlow3)" opacity="0.5"/>
          <ellipse cx="0" cy="0" rx="1.5" ry="2.5" fill="#047857"/>
          <circle cx="0" cy="0.8" r="1.2" fill="#06B6D4" opacity="0.8"/>
        </g>
      </svg>
    `
    floatingBallContainer.appendChild(icon)

    // 添加事件监听器
    let isDragging = false

    floatingBallContainer.addEventListener('mouseenter', () => {
      if (!isDragging) {
        floatingBallContainer.style.transform = 'scale(1.05)'
        floatingBallContainer.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.2)'
        floatingBallContainer.style.right = '32px'
      }
    })

    floatingBallContainer.addEventListener('mouseleave', () => {
      if (!isDragging) {
        floatingBallContainer.style.transform = 'scale(1)'
        floatingBallContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)'
        floatingBallContainer.style.right = '8px'
      }
    })

    floatingBallContainer.addEventListener('click', () => {
      if (!isDragging) {
        floatingBallContainer.style.transform = 'scale(0.95)'
        setTimeout(() => {
          floatingBallContainer.style.transform = 'scale(1)'
        }, 150)

        chrome.runtime.sendMessage({ type: 'TOGGLE_DEVTOOLS_SIDEBAR' })
      }
    })

    // 添加到页面
    document.body.appendChild(floatingBallContainer)

    console.log('✅ [CONTENT] 强制创建悬浮球成功')
  } catch (error) {
    console.error('❌ [CONTENT] 强制创建悬浮球失败:', error)
  }
}

// 暴露到全局，方便调试
;(window as any).forceCreateFloatingBall = forceCreateFloatingBall

// 创建DevTools侧边栏 - 直接嵌入原有弹窗
async function createDevToolsSidebar() {
  if (devToolsSidebarContainer) {
    console.log('⏭️ [CONTENT] DevTools侧边栏已存在')
    return
  }

  try {
    // 创建侧边栏容器
    devToolsSidebarContainer = document.createElement('div')
    devToolsSidebarContainer.id = 'network-monitor-devtools-sidebar'
    devToolsSidebarContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: -650px;
      width: 650px;
      height: 100vh;
      z-index: 2147483647;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-left: 1px solid #dcdfe6;
      overflow: hidden;
    `

    // 创建关闭按钮
    const closeButton = document.createElement('button')
    closeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `
    closeButton.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      z-index: 10;
      transition: all 0.2s;
    `
    closeButton.title = '关闭侧边栏'

    // 添加悬停效果
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.2)'
      closeButton.style.color = '#333'
    })
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.1)'
      closeButton.style.color = '#666'
    })

    // 添加点击事件
    closeButton.addEventListener('click', () => {
      if (window.hideDevToolsSidebar) {
        window.hideDevToolsSidebar()
      }
    })

    // 创建iframe来加载原有的弹窗
    const iframe = document.createElement('iframe')
    iframe.id = 'popup-iframe'
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    `

    // 获取扩展ID并设置iframe源
    const extensionId = chrome.runtime.id
    iframe.src = `chrome-extension://${extensionId}/popup.html`

    // iframe加载完成后注入样式来隐藏不需要的部分
    iframe.addEventListener('load', () => {
      console.log('📱 [CONTENT] 弹窗iframe加载完成，注入侧边栏专用样式')

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          // 创建样式元素
          const style = iframeDoc.createElement('style')
          style.textContent = `
            /* 侧边栏中默认显示完全折叠状态（小点） */
            .header {
              display: block !important;
              visibility: visible !important;
              height: auto !important;
              overflow: visible !important;
            }

            .config-section {
              display: block !important;
              visibility: visible !important;
              height: auto !important;
              overflow: visible !important;
            }

            /* 强制显示完全折叠状态 */
            .header .header-dot {
              display: flex !important;
            }

            .config-section .config-dot {
              display: flex !important;
            }

            /* 隐藏普通状态 */
            .header > div:not(.header-dot) {
              display: none !important;
            }

            .config-section > div:not(.config-dot) {
              display: none !important;
            }

            /* 通过JavaScript设置完全折叠状态 */
            body.sidebar-mode .header {
              --header-fully-collapsed: true;
            }

            body.sidebar-mode .config-section {
              --config-fully-collapsed: true;
            }

            /* 隐藏过滤和搜索区域 */
            .filter-section {
              display: none !important;
            }

            /* 确保全屏按钮被隐藏 */
            .fullscreen-btn,
            button.fullscreen-btn,
            .el-button.fullscreen-btn,
            [class*="fullscreen-btn"] {
              display: none !important;
              visibility: hidden !important;
            }

            /* 调整主容器样式 */
            .network-monitor {
              height: 100vh !important;
              display: flex !important;
              flex-direction: column !important;
              padding: 0 !important;
            }

            /* 调整请求区域样式，让它占满整个空间 */
            .requests-section {
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              overflow: hidden !important;
            }

            /* 请求列表标题样式 */
            .requests-header {
              padding: 16px 20px !important;
              background: #f8f9fa !important;
              border-bottom: 1px solid #e9ecef !important;
              font-weight: 600 !important;
              color: #495057 !important;
              font-size: 16px !important;
              flex-shrink: 0 !important;
            }

            /* 请求列表容器 */
            .requests-list-container {
              flex: 1 !important;
              overflow-y: auto !important;
              padding: 16px 20px !important;
            }

            /* 请求项样式优化 */
            .request-item {
              margin-bottom: 12px !important;
              border-radius: 8px !important;
              transition: all 0.2s ease !important;
              border: 1px solid #e9ecef !important;
            }

            .request-item:hover {
              box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
              transform: translateY(-2px) !important;
              border-color: #409eff !important;
            }

            /* 空状态样式 */
            .empty-state {
              padding: 60px 20px !important;
              text-align: center !important;
              color: #6c757d !important;
              font-size: 16px !important;
            }

            .empty-state .empty-icon {
              font-size: 48px !important;
              margin-bottom: 16px !important;
              opacity: 0.5 !important;
            }

            /* 确保body和html占满高度 */
            html, body {
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }

            /* 主应用容器 */
            #app {
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
            }

            /* 滚动条样式 */
            .requests-list-container::-webkit-scrollbar {
              width: 6px !important;
            }

            .requests-list-container::-webkit-scrollbar-track {
              background: #f1f1f1 !important;
              border-radius: 3px !important;
            }

            .requests-list-container::-webkit-scrollbar-thumb {
              background: #c1c1c1 !important;
              border-radius: 3px !important;
            }

            .requests-list-container::-webkit-scrollbar-thumb:hover {
              background: #a8a8a8 !important;
            }
          `

          // 将样式添加到iframe的head中
          iframeDoc.head.appendChild(style)
          console.log('✅ [CONTENT] 侧边栏专用样式注入成功')

          // 强制设置完全折叠状态的函数
          const forceCollapse = () => {
            try {
              const iframeWindow = iframe.contentWindow as any
              if (iframeWindow && iframeWindow.document) {
                // 通过postMessage发送折叠指令
                iframeWindow.postMessage({
                  type: 'FORCE_COLLAPSE_MODULES',
                  headerFullyCollapsed: true,
                  configFullyCollapsed: true
                }, '*')
                console.log('✅ [CONTENT] 已发送强制折叠指令')
              }
            } catch (error) {
              console.log('⚠️ [CONTENT] 发送折叠指令失败，使用CSS强制控制')
            }
          }

          // 等待Vue应用加载完成后，强制设置完全折叠状态
          setTimeout(forceCollapse, 500)
          setTimeout(forceCollapse, 1000)
          setTimeout(forceCollapse, 2000)
        }
      } catch (error) {
        console.error('❌ [CONTENT] 注入样式失败:', error)
      }
    })

    devToolsSidebarContainer.appendChild(closeButton)
    devToolsSidebarContainer.appendChild(iframe)
    document.body.appendChild(devToolsSidebarContainer)

    console.log('✅ [CONTENT] DevTools侧边栏创建成功，使用iframe加载原有弹窗')


    // 显示/隐藏函数
    window.showDevToolsSidebar = () => {
      console.log('📖 [CONTENT] 显示DevTools侧边栏（固定显示，使用iframe）')
      devToolsSidebarContainer.style.right = '0px'

      // 每次显示侧边栏都强制折叠模块 - 使用多种通信方式
      const sendCollapseMessage = () => {
        let success = false

        // 方式1：尝试postMessage到iframe
        try {
          const popupIframe = devToolsSidebarContainer.querySelector('#popup-iframe') as HTMLIFrameElement
          const iframeWindow = popupIframe?.contentWindow
          if (iframeWindow) {
            iframeWindow.postMessage({
              type: 'FORCE_COLLAPSE_MODULES',
              headerFullyCollapsed: true,
              configFullyCollapsed: true
            }, '*')
            console.log('✅ [CONTENT] 通过postMessage发送强制折叠指令')
            success = true
          }
        } catch (error) {
          console.log('⚠️ [CONTENT] postMessage发送失败:', error)
        }

        // 方式2：通过Chrome扩展消息系统发送（备用方案）
        try {
          chrome.runtime.sendMessage({
            type: 'FORCE_COLLAPSE_MODULES',
            headerFullyCollapsed: true,
            configFullyCollapsed: true
          }).then(() => {
            console.log('✅ [CONTENT] 通过Chrome消息系统发送强制折叠指令')
          }).catch((error) => {
            console.log('⚠️ [CONTENT] Chrome消息系统发送失败:', error)
          })
        } catch (error) {
          console.log('⚠️ [CONTENT] Chrome消息系统发送异常:', error)
        }

        return success
      }

      // 多次尝试发送折叠指令，确保成功
      setTimeout(() => sendCollapseMessage(), 100)
      setTimeout(() => sendCollapseMessage(), 300)
      setTimeout(() => sendCollapseMessage(), 500)
      setTimeout(() => sendCollapseMessage(), 1000)

      // 保存显示状态
      chrome.storage.local.set({ devToolsSidebarVisible: true })
    }

    window.hideDevToolsSidebar = () => {
      console.log('📕 [CONTENT] 隐藏DevTools侧边栏')
      devToolsSidebarContainer.style.right = '-650px'
      // 保存隐藏状态
      chrome.storage.local.set({ devToolsSidebarVisible: false })
    }

    window.toggleDevToolsSidebar = () => {
      const isVisible = devToolsSidebarContainer.style.right === '0px'
      if (isVisible) {
        // 如果已经显示，不做任何操作（保持固定显示）
        console.log('📌 [CONTENT] DevTools侧边栏已固定显示，无需切换')
      } else {
        // 如果隐藏，则显示并固定
        window.showDevToolsSidebar()
      }
    }

    // iframe加载完成后的处理
    const popupIframe = devToolsSidebarContainer.querySelector('#popup-iframe')
    if (popupIframe) {
      popupIframe.addEventListener('load', () => {
        console.log('📱 [CONTENT] 弹窗iframe加载完成')
      })
    }

    console.log('✅ [CONTENT] DevTools侧边栏创建成功')
  } catch (error) {
    console.error('❌ [CONTENT] 创建DevTools侧边栏失败:', error)
  }
}

// 销毁DevTools侧边栏
function destroyDevToolsSidebar() {
  if (devToolsSidebarApp) {
    devToolsSidebarApp.unmount()
    devToolsSidebarApp = null
  }

  if (devToolsSidebarContainer) {
    devToolsSidebarContainer.remove()
    devToolsSidebarContainer = null
  }

  // 清理全局函数
  if (window.showDevToolsSidebar) delete window.showDevToolsSidebar
  if (window.hideDevToolsSidebar) delete window.hideDevToolsSidebar
  if (window.toggleDevToolsSidebar) delete window.toggleDevToolsSidebar

  console.log('🗑️ [CONTENT] DevTools侧边栏已销毁')
}

// 切换DevTools侧边栏
async function toggleDevToolsSidebar() {
  console.log('🔄 [CONTENT] 切换DevTools侧边栏')

  if (!devToolsSidebarContainer) {
    console.log('📦 [CONTENT] DevTools侧边栏不存在，创建中...')
    await createDevToolsSidebar()

    // 创建完成后立即显示并固定
    setTimeout(() => {
      if (window.showDevToolsSidebar) {
        console.log('✅ [CONTENT] DevTools侧边栏创建完成，立即显示并固定')
        window.showDevToolsSidebar()
      }
    }, 100)
  } else {
    // 检查当前状态
    const isVisible = devToolsSidebarContainer.style.right === '0px'
    if (!isVisible) {
      console.log('📖 [CONTENT] DevTools侧边栏已存在但隐藏，显示并固定')
      if (window.showDevToolsSidebar) {
        window.showDevToolsSidebar()
      }
    } else {
      console.log('📌 [CONTENT] DevTools侧边栏已显示，但仍需强制折叠模块')
      // 即使侧边栏已经显示，也要强制折叠模块
      const sendCollapseMessageForVisible = () => {
        let success = false

        // 方式1：尝试postMessage到iframe
        try {
          const iframe = devToolsSidebarContainer.querySelector('#popup-iframe') as HTMLIFrameElement
          const iframeWindow = iframe?.contentWindow
          if (iframeWindow) {
            iframeWindow.postMessage({
              type: 'FORCE_COLLAPSE_MODULES',
              headerFullyCollapsed: true,
              configFullyCollapsed: true
            }, '*')
            console.log('✅ [CONTENT] 通过postMessage发送强制折叠指令（侧边栏已显示）')
            success = true
          }
        } catch (error) {
          console.log('⚠️ [CONTENT] postMessage发送失败（侧边栏已显示）:', error)
        }

        // 方式2：通过Chrome扩展消息系统发送（备用方案）
        try {
          chrome.runtime.sendMessage({
            type: 'FORCE_COLLAPSE_MODULES',
            headerFullyCollapsed: true,
            configFullyCollapsed: true
          }).then(() => {
            console.log('✅ [CONTENT] 通过Chrome消息系统发送强制折叠指令（侧边栏已显示）')
          }).catch((error) => {
            console.log('⚠️ [CONTENT] Chrome消息系统发送失败（侧边栏已显示）:', error)
          })
        } catch (error) {
          console.log('⚠️ [CONTENT] Chrome消息系统发送异常（侧边栏已显示）:', error)
        }

        return success
      }

      // 多次尝试发送折叠指令
      setTimeout(() => sendCollapseMessageForVisible(), 100)
      setTimeout(() => sendCollapseMessageForVisible(), 300)
      setTimeout(() => sendCollapseMessageForVisible(), 500)
      setTimeout(() => sendCollapseMessageForVisible(), 1000)
    }
  }
}

// 辅助函数
function showSidebar() {
  if (window.showDevToolsSidebar) {
    window.showDevToolsSidebar()
  }
}

function hideSidebar() {
  if (window.hideDevToolsSidebar) {
    window.hideDevToolsSidebar()
  }
}

// 页面加载完成后注入页面脚本和创建相关组件
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    injectPageScript()
    createFloatingSidebar()
    createFloatingBall()
    await createDevToolsSidebar()

    // 检查是否需要自动显示DevTools侧边栏
    const result = await chrome.storage.local.get(['devToolsSidebarVisible'])
    if (result.devToolsSidebarVisible && window.showDevToolsSidebar) {
      setTimeout(() => {
        window.showDevToolsSidebar()
        console.log('🔄 [CONTENT] 自动恢复DevTools侧边栏显示状态')
      }, 200)
    }
  })
} else {
  injectPageScript()
  createFloatingSidebar()
  createFloatingBall()
  createDevToolsSidebar().then(async () => {
    // 检查是否需要自动显示DevTools侧边栏
    const result = await chrome.storage.local.get(['devToolsSidebarVisible'])
    if (result.devToolsSidebarVisible && window.showDevToolsSidebar) {
      setTimeout(() => {
        window.showDevToolsSidebar()
        console.log('🔄 [CONTENT] 自动恢复DevTools侧边栏显示状态')
      }, 200)
    }
  })
}

console.log('🚀 [CONTENT] 网络请求监听器内容脚本已加载完成')

} // 结束防重复注入的if语句
