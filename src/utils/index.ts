import type { NetworkRequest, CurlOptions, ResponseValidationRule } from '@/types'

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

/**
 * 格式化时间 - 简化版本
 */
export function formatTime(timestamp: number | string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化持续时间
 */
export function formatDuration(duration: number): string {
  if (duration < 1000) {
    return `${duration}ms`
  }
  return `${(duration / 1000).toFixed(2)}s`
}

/**
 * 判断是否为错误状态码
 */
export function isErrorStatus(status: number): boolean {
  return status >= 400 || status === 0
}

/**
 * 从URL中提取域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return ''
  }
}

/**
 * 检查URL是否匹配指定域名
 */
export function matchesDomain(url: string, targetDomain: string): boolean {
  if (!targetDomain) return false

  const domain = extractDomain(url)
  return domain === targetDomain || domain.endsWith(`.${targetDomain}`)
}

/**
 * 检查URL是否匹配指定域名列表中的任一域名
 */
export function matchesAnyDomain(url: string, targetDomains: string[]): boolean {
  if (!targetDomains || targetDomains.length === 0) return false

  return targetDomains.some(domain => matchesDomain(url, domain))
}

/**
 * 检查URL是否匹配指定API前缀（支持通配符）
 */
export function matchesApiPrefix(url: string, apiPrefix: string): boolean {
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
 * 支持格式：
 * - *.domain.com - 匹配所有domain.com的子域名
 * - *.domain.com/path - 匹配所有domain.com子域名下的特定路径
 * - https://*.domain.com - 匹配特定协议下的子域名
 */
export function matchesWildcardApiPrefix(url: string, wildcardPrefix: string): boolean {
  try {
    // 解析URL
    const urlObj = new URL(url)

    // 处理通配符前缀
    let prefixPattern = wildcardPrefix
    let protocolRequired = ''

    // 检查是否指定了协议
    if (prefixPattern.startsWith('http://') || prefixPattern.startsWith('https://')) {
      const protocolMatch = prefixPattern.match(/^(https?:\/\/)/)
      if (protocolMatch) {
        protocolRequired = protocolMatch[1]
        prefixPattern = prefixPattern.substring(protocolMatch[1].length)
      }
    }

    // 如果指定了协议，检查协议是否匹配
    if (protocolRequired && !url.startsWith(protocolRequired)) {
      return false
    }

    // 分离域名和路径部分
    const parts = prefixPattern.split('/')
    const domainPattern = parts[0]
    const pathPattern = parts.length > 1 ? '/' + parts.slice(1).join('/') : ''

    // 处理域名通配符匹配
    if (domainPattern.startsWith('*.')) {
      const baseDomain = domainPattern.substring(2) // 移除 *.

      // 检查域名是否匹配
      const urlDomain = urlObj.hostname
      const domainMatches = urlDomain === baseDomain || urlDomain.endsWith('.' + baseDomain)

      if (!domainMatches) {
        return false
      }

      // 如果有路径要求，检查路径是否匹配
      if (pathPattern) {
        const urlPath = urlObj.pathname + urlObj.search
        return urlPath.startsWith(pathPattern)
      }

      return true
    }

    return false
  } catch (error) {
    console.warn('通配符API前缀匹配失败:', error)
    return false
  }
}

/**
 * 检查URL是否匹配指定API前缀列表中的任一前缀
 */
export function matchesAnyApiPrefix(url: string, apiPrefixes: string[]): boolean {
  if (!apiPrefixes || apiPrefixes.length === 0) return false

  return apiPrefixes.some(prefix => matchesApiPrefix(url, prefix))
}

/**
 * 格式化JSON字符串
 */
export function formatJson(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonString
  }
}

/**
 * 生成CURL命令
 */
export function generateCurl(
  request: NetworkRequest,
  options: CurlOptions = {
    includeHeaders: true,
    includeBody: true,
    compressed: true,
    followRedirects: true
  },
  urlReplaceRules?: Array<{from: string, to: string, enabled: boolean}>
): string {
  try {
    // 验证输入参数
    if (!request) {
      throw new Error('请求对象不能为空')
    }

    if (!request.url) {
      throw new Error('请求URL不能为空')
    }

    if (!request.method) {
      throw new Error('请求方法不能为空')
    }

    const parts: string[] = ['curl']

    // 添加请求方法
    if (request.method && request.method !== 'GET') {
      parts.push(`-X ${request.method}`)
    }

    // 添加请求头
    if (options.includeHeaders && request.requestHeaders && typeof request.requestHeaders === 'object') {
      Object.entries(request.requestHeaders).forEach(([key, value]) => {
        try {
          // 跳过一些浏览器自动添加的头部，但保留重要的头部
          const skipHeaders = ['host', 'connection', 'content-length', 'user-agent']
          if (key && value && !skipHeaders.includes(key.toLowerCase())) {
            // 安全地转义单引号
            const escapedValue = String(value).replace(/'/g, "'\"'\"'")
            parts.push(`-H '${key}: ${escapedValue}'`)
          }
        } catch (headerError) {
          console.warn('处理请求头时出错:', key, value, headerError)
        }
      })
    }

    // 添加请求体
    if (options.includeBody && request.requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      try {
        let bodyData = request.requestBody

        // 跳过特殊标记的请求体
        if (bodyData.startsWith('[') && bodyData.endsWith(']')) {
          // 这是特殊标记（如[FormData], [Binary Data]等），添加注释
          parts.push(`# 原始请求体: ${bodyData}`)
          parts.push(`# -d '${bodyData}'`)
        } else {
          // 处理实际的请求体数据
          if (typeof bodyData === 'string') {
            // 检查是否是JSON格式
            if (bodyData.trim().startsWith('{') || bodyData.trim().startsWith('[')) {
              try {
                // 尝试格式化JSON
                const parsedBody = JSON.parse(bodyData)
                bodyData = JSON.stringify(parsedBody, null, 2)
              } catch {
                // 如果解析失败，使用原始字符串
              }
            }

            // 安全地转义特殊字符
            const escapedBody = bodyData.replace(/\\/g, '\\\\').replace(/'/g, "'\"'\"'")
            parts.push(`-d '${escapedBody}'`)
          } else {
            // 非字符串类型，尝试序列化
            try {
              const serializedBody = JSON.stringify(bodyData, null, 2)
              const escapedBody = serializedBody.replace(/\\/g, '\\\\').replace(/'/g, "'\"'\"'")
              parts.push(`-d '${escapedBody}'`)
            } catch {
              parts.push(`# 无法序列化的请求体类型`)
            }
          }
        }
      } catch (bodyError) {
        console.warn('处理请求体时出错:', bodyError)
        parts.push(`# 请求体处理失败: ${bodyError}`)
      }
    }

    // 添加其他选项
    if (options.compressed) {
      parts.push('--compressed')
    }

    if (options.followRedirects) {
      parts.push('-L')
    }

    // 处理URL替换
    let finalUrl = request.url
    if (urlReplaceRules && urlReplaceRules.length > 0) {
      finalUrl = replaceUrlByRules(request.url, urlReplaceRules)
    }

    // 添加URL（放在最后，避免参数混乱）
    parts.push(`'${finalUrl}'`)

    const result = parts.join(' \\\n  ')

    if (!result || result.trim() === '') {
      throw new Error('生成的CURL命令为空')
    }

    return result
  } catch (error) {
    console.error('generateCurl函数执行失败:', error)
    throw error
  }
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}

/**
 * 导出数据为JSON文件
 */
export function exportToJson(data: any, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

/**
 * 验证域名格式（支持通配符）
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false
  }

  // 移除协议前缀
  const cleanDomain = domain.replace(/^https?:\/\//, '')

  // 支持通配符域名
  if (cleanDomain.startsWith('*.')) {
    const wildcardDomain = cleanDomain.substring(2)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/
    return domainRegex.test(wildcardDomain) && wildcardDomain.includes('.')
  }

  // 简化的域名验证，更宽松
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/

  // 基本格式检查
  if (!domainRegex.test(cleanDomain)) {
    return false
  }

  // 检查长度
  if (cleanDomain.length > 253) {
    return false
  }

  // 检查是否包含至少一个点（除非是localhost等特殊情况）
  if (!cleanDomain.includes('.') && !['localhost', 'api'].includes(cleanDomain)) {
    return false
  }

  return true
}

/**
 * 检查当前域名是否匹配配置的域名列表
 * @param currentDomain 当前域名
 * @param configuredDomains 配置的域名列表
 * @returns 是否匹配
 */
export function matchesDomainConfig(currentDomain: string, configuredDomains: string[]): boolean {
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
 * 验证API前缀格式（支持通配符）
 */
export function isValidApiPrefix(prefix: string): boolean {
  if (!prefix || typeof prefix !== 'string') {
    return false
  }

  // 如果包含通配符，进行通配符格式验证
  if (prefix.includes('*')) {
    return isValidWildcardApiPrefix(prefix)
  }

  // 检查是否是有效的URL格式
  try {
    new URL(prefix)
    return true
  } catch {
    return false
  }
}

/**
 * 验证通配符API前缀格式
 * 支持的格式：
 * - *.domain.com
 * - *.domain.com/path
 * - https://*.domain.com
 * - https://*.domain.com/path
 */
export function isValidWildcardApiPrefix(prefix: string): boolean {
  try {
    // 基本格式检查
    if (!prefix.includes('*.')) {
      return false
    }

    let pattern = prefix

    // 处理协议部分
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      const protocolMatch = pattern.match(/^(https?:\/\/)/)
      if (protocolMatch) {
        pattern = pattern.substring(protocolMatch[1].length)
      }
    }

    // 检查通配符位置
    if (!pattern.startsWith('*.')) {
      return false
    }

    // 移除通配符前缀
    const domainAndPath = pattern.substring(2)

    // 检查域名部分是否有效
    const parts = domainAndPath.split('/')
    const domain = parts[0]

    // 域名不能为空，且应该包含至少一个点
    if (!domain || !domain.includes('.')) {
      return false
    }

    // 简单的域名格式检查
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * 根据替换规则替换URL
 */
export function replaceUrlByRules(url: string, rules: Array<{from: string, to: string, enabled: boolean}>): string {
  if (!url || !rules || rules.length === 0) {
    return url
  }

  for (const rule of rules) {
    if (rule.enabled && url.startsWith(rule.from)) {
      return url.replace(rule.from, rule.to)
    }
  }

  return url
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
 *
 * 规则逻辑说明：
 * - equals: 只有当值等于期望值时才正常，否则标记为异常
 * - not_equals: 只有当值不等于期望值时才正常，否则标记为异常
 * - contains: 只有当值包含期望值时才正常，否则标记为异常
 * - not_contains: 只有当值不包含期望值时才正常，否则标记为异常
 *
 * @param responseBody 响应体字符串
 * @param rules 验证规则数组
 * @returns true表示验证通过（正常），false表示验证失败（异常）
 */
export function validateResponse(responseBody: string, rules: ResponseValidationRule[]): boolean {
  // 没有规则时认为验证通过
  if (!rules || rules.length === 0) {
    console.log('📋 没有验证规则，验证通过')
    return true
  }

  // 过滤出启用的规则
  const enabledRules = rules.filter(rule => rule.enabled)
  if (enabledRules.length === 0) {
    console.log('📋 没有启用的验证规则，验证通过')
    return true
  }

  try {
    const responseData = JSON.parse(responseBody)
    console.log('🔍 开始响应验证')
    console.log('📋 响应数据:', responseData)
    console.log('📏 启用的验证规则数量:', enabledRules.length)

    for (const rule of enabledRules) {

      console.log(`\n🔎 验证规则: ${rule.key} ${rule.operator} ${rule.expectedValue}`)

      const actualValue = responseData[rule.key]
      const expectedValue = rule.expectedValue

      // 增强类型处理：统一转换为字符串进行比较
      const actualValueStr = actualValue !== undefined && actualValue !== null ? String(actualValue) : ''
      const expectedValueStr = String(expectedValue)

      console.log(`📊 实际值: ${actualValue} (类型: ${typeof actualValue})`)
      console.log(`🎯 期望值: ${expectedValue} (类型: ${typeof expectedValue})`)
      console.log(`🔄 转换后比较: "${actualValueStr}" vs "${expectedValueStr}"`)

      // 执行验证逻辑
      const validationResult = performValidation(actualValueStr, expectedValueStr, rule.operator)

      if (!validationResult.isValid) {
        console.log(`❌ 验证失败: ${validationResult.reason}，标记为异常`)
        return false // 任何一个规则失败都标记为异常
      } else {
        console.log(`✅ 规则通过: ${rule.key}`)
      }
    }

    console.log('🎉 所有验证规则通过，响应正常')
    return true
  } catch (error) {
    console.log('💥 JSON解析失败:', error)
    // JSON解析失败，认为验证失败
    return false
  }
}

/**
 * 发送CURL请求
 */
export async function sendCurlRequest(request: NetworkRequest, urlReplaceRules?: Array<{from: string, to: string, enabled: boolean}>): Promise<{
  success: boolean
  status?: number
  statusText?: string
  responseBody?: string
  responseHeaders?: Record<string, string>
  error?: string
  duration: number
}> {
  const startTime = Date.now()

  try {
    // 处理URL替换
    let finalUrl = request.url
    if (urlReplaceRules && urlReplaceRules.length > 0) {
      finalUrl = replaceUrlByRules(request.url, urlReplaceRules)
    }

    // 构建请求选项
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: {}
    }

    // 添加请求头（过滤掉一些浏览器自动添加的头部）
    if (request.requestHeaders) {
      const skipHeaders = ['host', 'connection', 'content-length', 'user-agent', 'origin', 'referer']
      Object.entries(request.requestHeaders).forEach(([key, value]) => {
        if (!skipHeaders.includes(key.toLowerCase())) {
          (fetchOptions.headers as Record<string, string>)[key] = value
        }
      })
    }

    // 添加请求体
    if (request.requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      // 跳过特殊标记的请求体
      if (!request.requestBody.startsWith('[') || !request.requestBody.endsWith(']')) {
        fetchOptions.body = request.requestBody
      }
    }

    const response = await fetch(finalUrl, fetchOptions)
    const duration = Date.now() - startTime

    // 获取响应头
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // 获取响应体
    const responseBody = await response.text()

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      responseBody,
      responseHeaders,
      duration
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      success: false,
      error: error instanceof Error ? error.message : '请求失败',
      duration
    }
  }
}
