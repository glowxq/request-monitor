/**
 * Chrome插件后台服务 - Service Worker
 * 负责监听网络请求和管理数据存储
 */

// 内联类型定义
interface NetworkRequest {
  id: string
  url: string
  method: string
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
  isValidationError?: boolean
  errorType?: string
}

interface ResponseValidationRule {
  key: string
  expectedValue: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains'
  enabled: boolean
}

interface UrlReplaceRule {
  from: string
  to: string
  enabled: boolean
}

interface MonitorConfig {
  apiPrefixes: string[]
  isActive: boolean
  includeSuccessRequests: boolean
  maxRecords: number
  autoExport: boolean
  enableConsoleLog: boolean
  urlReplaceRules: UrlReplaceRule[]
  responseValidationRules: ResponseValidationRule[]
  domainConfig: DomainConfig
}

interface DomainConfig {
  enabled: boolean
  domains: string[]
}

interface StorageData {
  config: MonitorConfig
  requests: NetworkRequest[]
  lastUpdated: number
}

interface Message {
  type: string
  payload?: any
}

interface MessageResponse {
  success: boolean
  data?: any
  error?: string
}

// 内联工具函数
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function isErrorStatus(status: number): boolean {
  return status >= 400
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'unknown'
  }
}

function matchesAnyApiPrefix(url: string, prefixes: string[]): boolean {
  if (!prefixes || prefixes.length === 0) {
    logIfEnabled('🔍 没有配置API前缀')
    return false
  }

  logIfEnabled('🔍 检查URL匹配:', url)
  logIfEnabled('🔍 配置的前缀:', prefixes)

  const result = prefixes.some(prefix => {
    const matches = matchesApiPrefix(url, prefix)
    logIfEnabled(`🔍 ${url} vs ${prefix} = ${matches}`)
    return matches
  })

  logIfEnabled('🔍 最终匹配结果:', result)
  return result
}

/**
 * 检查URL是否匹配指定API前缀（支持通配符）
 */
function matchesApiPrefix(url: string, apiPrefix: string): boolean {
  if (!apiPrefix || !url) return false

  // 如果是通配符格式
  if (apiPrefix.includes('*')) {
    return matchesWildcardApiPrefix(url, apiPrefix)
  }

  // 传统的前缀匹配
  return url.startsWith(apiPrefix)
}

/**
 * 通配符API前缀匹配
 */
function matchesWildcardApiPrefix(url: string, wildcardPrefix: string): boolean {
  try {
    logIfEnabled(`🔍 通配符匹配: ${url} vs ${wildcardPrefix}`)

    // 解析URL
    const urlObj = new URL(url)
    logIfEnabled(`🔍 解析URL: 域名=${urlObj.hostname}, 路径=${urlObj.pathname}`)

    // 处理通配符前缀
    let prefixPattern = wildcardPrefix
    let protocolRequired = ''

    // 检查是否指定了协议
    if (prefixPattern.startsWith('http://') || prefixPattern.startsWith('https://')) {
      const protocolMatch = prefixPattern.match(/^(https?:\/\/)/)
      if (protocolMatch) {
        protocolRequired = protocolMatch[1]
        prefixPattern = prefixPattern.substring(protocolMatch[1].length)
        logIfEnabled(`🔍 检测到协议要求: ${protocolRequired}`)
      }
    }

    // 如果指定了协议，检查协议是否匹配
    if (protocolRequired && !url.startsWith(protocolRequired)) {
      logIfEnabled(`🔍 协议不匹配: 要求${protocolRequired}, 实际${urlObj.protocol}//`)
      return false
    }

    // 分离域名和路径部分
    const parts = prefixPattern.split('/')
    const domainPattern = parts[0]
    const pathPattern = parts.length > 1 ? '/' + parts.slice(1).join('/') : ''
    logIfEnabled(`🔍 域名模式: ${domainPattern}, 路径模式: ${pathPattern}`)

    // 处理域名通配符匹配
    if (domainPattern.startsWith('*.')) {
      const baseDomain = domainPattern.substring(2) // 移除 *.
      logIfEnabled(`🔍 基础域名: ${baseDomain}`)

      // 检查域名是否匹配
      const urlDomain = urlObj.hostname
      const domainMatches = urlDomain === baseDomain || urlDomain.endsWith('.' + baseDomain)
      logIfEnabled(`🔍 域名匹配检查: ${urlDomain} vs ${baseDomain} = ${domainMatches}`)

      if (!domainMatches) {
        return false
      }

      // 如果有路径要求，检查路径是否匹配
      if (pathPattern) {
        const urlPath = urlObj.pathname + urlObj.search
        const pathMatches = urlPath.startsWith(pathPattern)
        logIfEnabled(`🔍 路径匹配检查: ${urlPath} vs ${pathPattern} = ${pathMatches}`)
        return pathMatches
      }

      logIfEnabled(`🔍 通配符匹配成功`)
      return true
    }

    return false
  } catch (error) {
    logIfEnabled('🔍 通配符API前缀匹配失败:', error)
    return false
  }
}

/**
 * 检查当前域名是否匹配配置的域名列表
 */
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

/**
 * 检查是否应该在当前标签页注入content script
 */
function shouldInjectContentScript(url: string, domainConfig: DomainConfig): boolean {
  // 如果未启用域名限制，默认不注入（更安全的做法）
  if (!domainConfig.enabled) {
    return false
  }

  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
    return false // 不在浏览器内部页面注入
  }

  try {
    const urlObj = new URL(url)
    return matchesDomainConfig(urlObj.hostname, domainConfig.domains)
  } catch {
    return false
  }
}

/**
 * 根据URL替换规则替换URL
 */
function applyUrlReplaceRules(url: string, rules: UrlReplaceRule[]): string {
  if (!url || !rules || rules.length === 0) return url

  for (const rule of rules) {
    if (rule.enabled && url.startsWith(rule.from)) {
      const replacedUrl = url.replace(rule.from, rule.to)
      logIfEnabled(`🔄 URL替换: ${url} → ${replacedUrl}`)
      return replacedUrl
    }
  }

  return url
}

/**
 * 更新declarativeNetRequest规则以实现URL代理
 */
async function updateNetRequestRules(rules: UrlReplaceRule[]): Promise<void> {
  try {
    // 清除现有规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    const ruleIdsToRemove = existingRules.map(rule => rule.id)

    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove
      })
    }

    // 添加新的重定向规则
    const enabledRules = rules.filter(rule => rule.enabled)
    const newRules = enabledRules.map((rule, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
        redirect: {
          regexSubstitution: rule.to + '\\1'
        }
      },
      condition: {
        regexFilter: `^${escapeRegex(rule.from)}(.*)$`,
        resourceTypes: ['xmlhttprequest', 'fetch'] as chrome.declarativeNetRequest.ResourceType[]
      }
    }))

    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      })
      logIfEnabled(`🔄 已更新 ${newRules.length} 条URL重定向规则`)
    }
  } catch (error) {
    console.error('更新URL重定向规则失败:', error)
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 执行单个验证规则的验证逻辑
 * @param actualValue 实际值（字符串）
 * @param expectedValue 期望值（字符串）
 * @param operator 操作符
 * @returns 验证结果对象
 */
function performValidation(actualValue: string, expectedValue: string, operator: string): {
  isValid: boolean
  reason: string
} {
  switch (operator) {
    case 'equals':
      // 只有当值等于期望值时才正常，否则标记为异常
      if (actualValue !== expectedValue) {
        return {
          isValid: false,
          reason: `实际值 "${actualValue}" 不等于期望值 "${expectedValue}"`
        }
      }
      break
    case 'not_equals':
      // 只有当值不等于期望值时才正常，否则标记为异常
      if (actualValue === expectedValue) {
        return {
          isValid: false,
          reason: `实际值 "${actualValue}" 等于期望值 "${expectedValue}"，但期望不等于`
        }
      }
      break
    case 'contains':
      // 只有当值包含期望值时才正常，否则标记为异常
      if (!actualValue.includes(expectedValue)) {
        return {
          isValid: false,
          reason: `实际值 "${actualValue}" 不包含期望值 "${expectedValue}"`
        }
      }
      break
    case 'not_contains':
      // 只有当值不包含期望值时才正常，否则标记为异常
      if (actualValue.includes(expectedValue)) {
        return {
          isValid: false,
          reason: `实际值 "${actualValue}" 包含期望值 "${expectedValue}"，但期望不包含`
        }
      }
      break
    default:
      return {
        isValid: false,
        reason: `未知的操作符: ${operator}`
      }
  }

  return {
    isValid: true,
    reason: ''
  }
}

/**
 * 验证响应数据是否符合规则
 * 返回true表示验证通过（正常），返回false表示验证失败（异常）
 * @param responseBody 响应体字符串
 * @param rules 验证规则数组
 * @returns true表示验证通过（正常），false表示验证失败（异常）
 */
function validateResponse(responseBody: string, rules: ResponseValidationRule[]): boolean {
  // 没有规则时认为验证通过
  if (!rules || rules.length === 0) {
    logIfEnabled('📋 没有验证规则，验证通过')
    return true
  }

  // 过滤出启用的规则
  const enabledRules = rules.filter(rule => rule.enabled)
  if (enabledRules.length === 0) {
    logIfEnabled('📋 没有启用的验证规则，验证通过')
    return true
  }

  try {
    const responseData = JSON.parse(responseBody)
    logIfEnabled('🔍 开始响应验证')
    logIfEnabled('📋 响应数据:', responseData)
    logIfEnabled('📏 启用的验证规则数量:', enabledRules.length)

    for (const rule of enabledRules) {
      logIfEnabled(`\n🔎 验证规则: ${rule.key} ${rule.operator} ${rule.expectedValue}`)

      // 获取响应数据中的实际值
      const actualValue = responseData[rule.key]
      const expectedValue = rule.expectedValue

      // 统一转换为字符串进行比较，处理各种数据类型
      const actualValueStr = actualValue !== undefined && actualValue !== null ? String(actualValue) : ''
      const expectedValueStr = String(expectedValue)

      logIfEnabled(`📊 实际值: ${actualValue} (类型: ${typeof actualValue})`)
      logIfEnabled(`🎯 期望值: ${expectedValue} (类型: ${typeof expectedValue})`)
      logIfEnabled(`🔄 转换后比较: "${actualValueStr}" vs "${expectedValueStr}"`)

      // 执行验证逻辑
      const validationResult = performValidation(actualValueStr, expectedValueStr, rule.operator)

      if (!validationResult.isValid) {
        logIfEnabled(`❌ 验证失败: ${validationResult.reason}，标记为异常`)
        return false // 任何一个规则失败都标记为异常
      } else {
        logIfEnabled(`✅ 规则通过: ${rule.key}`)
      }
    }

    logIfEnabled('🎉 所有验证规则通过，响应正常')
    return true // 返回true表示验证通过，不需要标记为异常
  } catch (error) {
    logIfEnabled('💥 JSON解析失败:', error)
    // JSON解析失败，认为验证失败，标记为异常
    return false
  }
}

// 全局状态
let isMonitoring = false
let currentConfig: MonitorConfig | null = null
let requestsCache: NetworkRequest[] = []

/**
 * 控制台日志输出函数
 */
function logIfEnabled(...args: any[]): void {
  if (currentConfig?.enableConsoleLog) {
    console.log(...args)
  }
}

function warnIfEnabled(...args: any[]): void {
  if (currentConfig?.enableConsoleLog) {
    console.warn(...args)
  }
}

function errorIfEnabled(...args: any[]): void {
  if (currentConfig?.enableConsoleLog) {
    console.error(...args)
  }
}

/**
 * 初始化插件
 */
async function initialize(): Promise<void> {
  console.log('网络请求监听器插件已启动')

  try {
    // 加载存储的配置
    const result = await chrome.storage.local.get(['config', 'requests'])
    logIfEnabled('加载的存储数据:', result)

    if (result.config) {
      currentConfig = result.config
      logIfEnabled('加载的配置:', currentConfig)
      if (currentConfig?.isActive) {
        logIfEnabled('自动开始监听:', currentConfig.apiPrefixes.join(', '))
        startMonitoring()
      }
    }
    if (result.requests) {
      requestsCache = result.requests
      logIfEnabled('加载的请求记录:', requestsCache.length, '条')
    }
  } catch (error) {
    console.error('初始化失败:', error)
  }
}

/**
 * 开始监听网络请求
 */
async function startMonitoring(): Promise<void> {
  if (isMonitoring || !currentConfig) return

  isMonitoring = true
  logIfEnabled(`开始监听API前缀: ${currentConfig.apiPrefixes.join(', ')}`)

  // 应用URL重定向规则
  if (currentConfig.urlReplaceRules && currentConfig.urlReplaceRules.length > 0) {
    await updateNetRequestRules(currentConfig.urlReplaceRules)
  }

  // 监听webRequest事件（Manifest V3 兼容）
  // 根据配置决定监听的请求类型
  const requestFilter = currentConfig.onlyRecordFetchXHR
    ? { urls: ['<all_urls>'], types: ['xmlhttprequest' as chrome.webRequest.ResourceType] }
    : { urls: ['<all_urls>'] }

  chrome.webRequest.onBeforeRequest.addListener(
    handleBeforeRequest,
    requestFilter,
    ['requestBody']
  )

  chrome.webRequest.onBeforeSendHeaders.addListener(
    handleBeforeSendHeaders,
    requestFilter,
    ['requestHeaders']
  )

  chrome.webRequest.onCompleted.addListener(
    handleCompleted,
    requestFilter,
    ['responseHeaders']
  )

  chrome.webRequest.onErrorOccurred.addListener(
    handleError,
    requestFilter
  )

  // 注入content script到符合域名配置的标签页并发送API前缀配置
  try {
    const tabs = await chrome.tabs.query({})  // 获取所有标签页，不只是活动的
    logIfEnabled(`找到 ${tabs.length} 个标签页，开始检查并注入content script`)

    for (const tab of tabs) {
      if (tab.id && tab.url) {
        // 检查是否应该在此标签页注入content script
        if (!shouldInjectContentScript(tab.url, currentConfig.domainConfig)) {
          logIfEnabled(`跳过标签页（域名不匹配）: ${tab.url}`)
          continue
        }

        try {
          // 先尝试发送消息检查content script是否已存在
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'PING' })
            logIfEnabled(`Content script已存在于标签页: ${tab.url}`)
          } catch {
            // Content script不存在，需要注入
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-script.js']
            })
            logIfEnabled(`Content script注入成功: ${tab.url}`)
          }

          // 发送API前缀配置到content script
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'UPDATE_MONITORING_API_PREFIXES',
              payload: currentConfig.apiPrefixes
            })
            logIfEnabled(`API前缀配置发送成功到 ${tab.url}: ${currentConfig.apiPrefixes.join(', ')}`)
          } catch (error) {
            logIfEnabled(`API前缀配置发送失败到 ${tab.url}:`, error)
          }
        } catch (error) {
          logIfEnabled(`处理标签页失败 ${tab.url}:`, error)
        }
      }
    }
  } catch (error) {
    logIfEnabled('注入content script时出错:', error)
  }
}

/**
 * 停止监听网络请求
 */
async function stopMonitoring(): Promise<void> {
  if (!isMonitoring) return

  isMonitoring = false
  logIfEnabled('停止监听网络请求')

  // 清除URL重定向规则
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    const ruleIdsToRemove = existingRules.map(rule => rule.id)

    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove
      })
      logIfEnabled('🔄 已清除所有URL重定向规则')
    }
  } catch (error) {
    console.error('清除URL重定向规则失败:', error)
  }

  // 移除所有监听器
  chrome.webRequest.onBeforeRequest.removeListener(handleBeforeRequest)
  chrome.webRequest.onBeforeSendHeaders.removeListener(handleBeforeSendHeaders)
  chrome.webRequest.onCompleted.removeListener(handleCompleted)
  chrome.webRequest.onErrorOccurred.removeListener(handleError)

  // 通知所有标签页停止监听并恢复原始方法
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'STOP_MONITORING'
          })
          logIfEnabled(`已通知标签页停止监听: ${tab.url}`)
        } catch (error) {
          // 忽略无法发送消息的标签页（可能没有content script）
        }
      }
    }
  } catch (error) {
    logIfEnabled('通知标签页停止监听时出错:', error)
  }
}

// 存储请求信息的临时对象
const pendingRequests = new Map<string, Partial<NetworkRequest>>()

/**
 * 处理请求开始事件
 */
function handleBeforeRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
  if (!currentConfig || !matchesAnyApiPrefix(details.url, currentConfig.apiPrefixes)) return

  // 处理请求体数据
  let requestBody: string | undefined = undefined
  if (details.requestBody) {
    try {
      if (details.requestBody.raw && details.requestBody.raw.length > 0) {
        // 处理原始数据
        const rawData = details.requestBody.raw[0]
        if (rawData.bytes) {
          // 将ArrayBuffer转换为字符串
          const decoder = new TextDecoder('utf-8')
          requestBody = decoder.decode(rawData.bytes)
        }
      } else if (details.requestBody.formData) {
        // 处理表单数据
        const formData: string[] = []
        Object.entries(details.requestBody.formData).forEach(([key, values]) => {
          if (Array.isArray(values)) {
            values.forEach(value => {
              formData.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            })
          }
        })
        requestBody = formData.join('&')
      }
    } catch (error) {
      console.warn('处理请求体失败:', error)
      requestBody = '[无法解析的请求体]'
    }
  }

  const requestInfo: Partial<NetworkRequest> = {
    id: generateId(),
    url: details.url,
    method: details.method as any,
    timestamp: Date.now(),
    domain: extractDomain(details.url),
    requestBody: requestBody
  }

  pendingRequests.set(details.requestId, requestInfo)
}

/**
 * 处理请求头事件
 */
function handleBeforeSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails): void {
  const requestInfo = pendingRequests.get(details.requestId)
  if (!requestInfo) return

  const headers: Record<string, string> = {}
  details.requestHeaders?.forEach(header => {
    if (header.name && header.value) {
      headers[header.name] = header.value
    }
  })

  requestInfo.requestHeaders = headers
}

/**
 * 处理请求完成事件
 */
function handleCompleted(details: chrome.webRequest.WebResponseHeadersDetails): void {
  const requestInfo = pendingRequests.get(details.requestId)
  if (!requestInfo) return

  const responseHeaders: Record<string, string> = {}
  details.responseHeaders?.forEach(header => {
    if (header.name && header.value) {
      responseHeaders[header.name] = header.value
    }
  })

  const networkRequest: NetworkRequest = {
    ...requestInfo,
    status: details.statusCode,
    statusText: getStatusText(details.statusCode),
    responseHeaders,
    responseBody: '[WebRequest API无法获取响应体，请使用页面脚本拦截]', // 明确标记
    duration: Date.now() - (requestInfo.timestamp || 0),
    isError: isErrorStatus(details.statusCode)
  } as NetworkRequest

  // 检查是否已经有页面脚本记录了相同的请求（通过URL和时间戳判断）
  const existingRequest = requestsCache.find(req =>
    req.url === networkRequest.url &&
    Math.abs(req.timestamp - networkRequest.timestamp) < 5000 && // 5秒内的请求认为是同一个
    req.responseBody && // 已有响应体的记录
    !req.responseBody.startsWith('[WebRequest API无法获取响应体')
  )

  if (existingRequest) {
    logIfEnabled('⏭️ 跳过WebRequest记录，已有页面脚本记录:', networkRequest.url)
    return
  }

  // 只有在没有页面脚本记录时才添加WebRequest记录
  logIfEnabled('📝 添加WebRequest记录（无响应体）:', networkRequest.url)
  addRequestRecord(networkRequest)

  pendingRequests.delete(details.requestId)
}

/**
 * 处理请求错误事件
 */
function handleError(details: chrome.webRequest.WebRequestErrorDetails): void {
  const requestInfo = pendingRequests.get(details.requestId)
  if (!requestInfo) return

  const networkRequest: NetworkRequest = {
    ...requestInfo,
    status: 0,
    statusText: details.error,
    responseHeaders: {},
    responseBody: '[网络错误，无响应体]', // 明确标记
    duration: Date.now() - (requestInfo.timestamp || 0),
    isError: true,
    errorType: 'network'
  } as NetworkRequest

  addRequestRecord(networkRequest)
  pendingRequests.delete(details.requestId)
}

/**
 * 添加请求记录
 */
async function addRequestRecord(request: NetworkRequest): Promise<void> {
  requestsCache.unshift(request)

  // 限制记录数量
  if (currentConfig?.maxRecords && requestsCache.length > currentConfig.maxRecords) {
    requestsCache = requestsCache.slice(0, currentConfig.maxRecords)
  }

  // 保存到存储
  await saveRequestsToStorage()

  // 通知popup更新
  try {
    chrome.runtime.sendMessage({ type: 'REQUEST_ADDED', payload: request })
  } catch (error) {
    // popup可能未打开，忽略错误
  }
}

/**
 * 保存请求记录到存储
 */
async function saveRequestsToStorage(): Promise<void> {
  const storageData: StorageData = {
    config: currentConfig!,
    requests: requestsCache,
    lastUpdated: Date.now()
  }

  await chrome.storage.local.set({ requests: requestsCache, lastUpdated: storageData.lastUpdated })
}

/**
 * 获取HTTP状态码对应的文本
 */
function getStatusText(statusCode: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  }

  return statusTexts[statusCode] || 'Unknown'
}

// 统一的消息处理
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  // 处理来自popup的消息
  if (message.type && ['START_MONITORING', 'STOP_MONITORING', 'GET_REQUESTS', 'CLEAR_REQUESTS', 'UPDATE_CONFIG'].includes(message.type)) {
    handleMessage(message as Message).then(sendResponse).catch(error => {
      console.error('Message handling error:', error)
      sendResponse({ success: false, error: error.message || '未知错误' })
    })
    return true // 保持消息通道开放
  }

  // 处理数据广播请求
  if (message.type === 'BROADCAST_DATA_UPDATE') {
    // 广播数据更新到所有扩展页面
    chrome.runtime.sendMessage({
      type: 'DATA_SYNC_RESPONSE',
      requests: message.requests,
      config: message.config
    }).catch(() => {}) // 忽略错误，可能没有其他页面在监听

    sendResponse({ success: true })
    return
  }

  // 处理数据同步请求
  if (message.type === 'DATA_SYNC_REQUEST') {
    // 响应数据同步请求
    sendResponse({
      success: true,
      requests: requestsCache,
      config: currentConfig
    })
    return
  }

  // 处理强制折叠请求
  if (message.type === 'FORCE_COLLAPSE_MODULES') {
    console.log('📨 [BACKGROUND] 收到强制折叠请求，转发到popup')
    // 转发强制折叠消息到popup（如果popup打开）
    chrome.runtime.sendMessage({
      type: 'FORCE_COLLAPSE_MODULES',
      headerFullyCollapsed: message.headerFullyCollapsed,
      configFullyCollapsed: message.configFullyCollapsed
    }).catch(() => {
      console.log('📨 [BACKGROUND] popup未打开，无法转发折叠消息')
    })

    sendResponse({ success: true })
    return
  }

  // 处理来自浮动侧边栏的消息
  if (message.type === 'OPEN_FULLSCREEN') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('standalone.html')
    })
    sendResponse({ success: true })
    return
  }

  if (message.type === 'GET_SIDEBAR_STATUS') {
    // 发送当前状态到浮动侧边栏
    const stats = {
      total: requestsCache.length,
      errors: requestsCache.filter(req => req.status >= 400 || req.hasValidationError).length
    }

    // 发送状态更新到所有content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'MONITORING_STATUS_CHANGED',
            isActive: isMonitoring
          }).catch(() => {}) // 忽略错误，某些标签页可能没有content script

          chrome.tabs.sendMessage(tab.id, {
            type: 'REQUEST_STATS_UPDATED',
            total: stats.total,
            errors: stats.errors
          }).catch(() => {})

          chrome.tabs.sendMessage(tab.id, {
            type: 'RECENT_REQUESTS_UPDATED',
            requests: requestsCache.slice(0, 5)
          }).catch(() => {})
        }
      })
    })

    sendResponse({ success: true })
    return
  }

  // 处理新悬浮球和DevTools侧边栏相关消息
  if (message.type === 'GET_FLOATING_BALL_STATUS' || message.type === 'GET_DEVTOOLS_SIDEBAR_STATUS') {
    // 发送当前状态到新组件
    const stats = {
      total: requestsCache.length,
      errors: requestsCache.filter(req => req.status >= 400 || req.hasValidationError).length
    }

    // 发送状态更新到所有content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'MONITORING_STATUS_CHANGED',
            isActive: isMonitoring
          }).catch(() => {})

          chrome.tabs.sendMessage(tab.id, {
            type: 'REQUEST_STATS_UPDATED',
            total: stats.total,
            errors: stats.errors
          }).catch(() => {})

          chrome.tabs.sendMessage(tab.id, {
            type: 'RECENT_REQUESTS_UPDATED',
            requests: requestsCache.slice(0, 20)
          }).catch(() => {})
        }
      })
    })

    sendResponse({ success: true })
    return
  }

  if (message.type === 'TOGGLE_DEVTOOLS_SIDEBAR') {
    // 转发消息到所有content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_DEVTOOLS_SIDEBAR'
          }).catch(() => {})
        }
      })
    })
    sendResponse({ success: true })
    return
  }

  // 处理来自content script的网络请求拦截消息
  if (message.type === 'NETWORK_REQUEST_INTERCEPTED') {
    const request: NetworkRequest = message.payload
    logIfEnabled('📨 收到页面脚本拦截消息:', {
      url: request.url,
      method: request.method,
      status: request.status,
      responseBodyLength: request.responseBody ? request.responseBody.length : 0,
      responseBodyPreview: request.responseBody ? request.responseBody.substring(0, 100) : '[无响应体]'
    })

    if (currentConfig && matchesAnyApiPrefix(request.url, currentConfig.apiPrefixes)) {
      logIfEnabled('✅ URL匹配API前缀，开始处理页面脚本请求')
      logIfEnabled('🌐 请求详情:', request.url, '状态:', request.status)
      logIfEnabled('📄 响应体长度:', request.responseBody ? request.responseBody.length : 0)

      // 检查是否已经有WebRequest记录，如果有则替换
      const existingIndex = requestsCache.findIndex(req =>
        req.url === request.url &&
        Math.abs(req.timestamp - request.timestamp) < 5000 && // 5秒内的请求认为是同一个
        req.responseBody &&
        req.responseBody.startsWith('[WebRequest API无法获取响应体')
      )

      if (existingIndex !== -1) {
        logIfEnabled('🔄 替换WebRequest记录为页面脚本记录:', request.url)
        requestsCache[existingIndex] = request
        // 通知popup更新
        try {
          chrome.runtime.sendMessage({ type: 'REQUEST_UPDATED', payload: request })
        } catch (error) {
          // popup可能未打开，忽略错误
        }
      } else {
        logIfEnabled('📝 添加新的页面脚本记录:', request.url)
      }

      // 进行响应验证（对所有有响应体的请求进行验证，不限制状态码）
      if (request.responseBody !== undefined &&
          request.responseBody !== null &&
          !request.responseBody.startsWith('[') &&
          currentConfig.responseValidationRules.length > 0) {

        logIfEnabled('🔍 开始响应验证，规则数量:', currentConfig.responseValidationRules.length)
        logIfEnabled('📋 启用的规则:', currentConfig.responseValidationRules.filter(r => r.enabled))
        logIfEnabled('📄 响应体内容:', request.responseBody.substring(0, 200) + (request.responseBody.length > 200 ? '...' : ''))

        const isValid = validateResponse(request.responseBody, currentConfig.responseValidationRules)
        logIfEnabled('✅ 验证结果:', isValid ? '通过' : '失败')

        if (!isValid) {
          request.isValidationError = true
          request.isError = true // 标记为错误请求
          logIfEnabled('⚠️ 请求被标记为验证异常:', request.url)
        } else {
          logIfEnabled('✅ 请求验证通过:', request.url)
        }
      } else {
        const skipReason = !request.responseBody ? '无响应体' :
                          request.responseBody.startsWith('[') ? '响应体读取失败' :
                          currentConfig.responseValidationRules.length === 0 ? '无验证规则' : '未知原因'
        logIfEnabled('⏭️ 跳过验证 - 原因:', skipReason)
        logIfEnabled('📊 响应体状态:', {
          hasResponseBody: !!request.responseBody,
          responseBodyType: typeof request.responseBody,
          responseBodyLength: request.responseBody ? request.responseBody.length : 0,
          responseBodyPreview: request.responseBody ? request.responseBody.substring(0, 50) : 'N/A',
          rulesCount: currentConfig.responseValidationRules.length
        })
      }

      // 如果不是替换操作，则添加新记录
      if (existingIndex === -1) {
        addRequestRecord(request)
      } else {
        // 如果是替换操作，需要保存到存储
        saveRequestsToStorage()
      }
    } else {
      logIfEnabled('❌ URL不匹配API前缀，跳过处理:', {
        url: request.url,
        configuredPrefixes: currentConfig ? currentConfig.apiPrefixes : [],
        hasConfig: !!currentConfig
      })
    }
    sendResponse({ success: true })
    return true
  }

  // 其他消息类型
  sendResponse({ success: false, error: '未知的消息类型' })
  return true
})

/**
 * 处理来自popup的消息
 */
async function handleMessage(message: Message): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case 'START_MONITORING':
        currentConfig = message.payload
        await chrome.storage.local.set({ config: currentConfig })
        await startMonitoring()
        return { success: true }

      case 'STOP_MONITORING':
        await stopMonitoring()
        if (currentConfig) {
          currentConfig.isActive = false
          await chrome.storage.local.set({ config: currentConfig })
        }
        return { success: true }

      case 'GET_REQUESTS':
        return { success: true, data: requestsCache }

      case 'CLEAR_REQUESTS':
        requestsCache = []
        await chrome.storage.local.set({ requests: [] })
        return { success: true }

      case 'UPDATE_CONFIG':
        // 更新配置并应用URL重定向规则
        currentConfig = message.payload
        await chrome.storage.local.set({ config: currentConfig })

        // 如果正在监听，更新URL重定向规则
        if (isMonitoring && currentConfig.urlReplaceRules) {
          await updateNetRequestRules(currentConfig.urlReplaceRules)
        }

        // 通知所有content scripts配置已更新
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'CONFIG_UPDATED',
                config: currentConfig
              }).catch(() => {}) // 忽略错误，某些标签页可能没有content script
            }
          })
        })

        return { success: true }

      default:
        return { success: false, error: '未知的消息类型' }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '未知错误' }
  }
}

// 移除重复的监听器，使用下面统一的监听器

// 监听标签页激活，确保content script已注入
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (isMonitoring && currentConfig) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId)
      if (tab.url && shouldInjectContentScript(tab.url, currentConfig.domainConfig)) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeInfo.tabId },
            files: ['content-script.js']
          })
          logIfEnabled(`Content script激活注入成功: ${tab.url}`)
        } catch (error) {
          logIfEnabled(`Content script激活注入失败: ${tab.url}`, error)
        }
      }
    } catch (error) {
      logIfEnabled('获取标签页信息失败:', error)
    }
  }
})

// 监听标签页更新，自动注入content script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只在页面加载完成且正在监听时注入
  if (changeInfo.status === 'complete' && isMonitoring && currentConfig && tab.url) {
    // 检查是否应该在此标签页注入content script
    if (!shouldInjectContentScript(tab.url, currentConfig.domainConfig)) {
      logIfEnabled(`跳过新标签页（域名不匹配）: ${tab.url}`)
      return
    }

    try {
      // 先检查content script是否已存在
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' })
        logIfEnabled(`Content script已存在于新标签页: ${tab.url}`)
      } catch {
        // Content script不存在，需要注入
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-script.js']
        })
        logIfEnabled(`自动注入content script到新标签页: ${tab.url}`)
      }

      // 发送API前缀配置
      await chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_MONITORING_API_PREFIXES',
        payload: currentConfig.apiPrefixes
      })
    } catch (error) {
      logIfEnabled(`自动注入content script失败: ${tab.url}`, error)
    }
  }
})

// 初始化插件
initialize()
