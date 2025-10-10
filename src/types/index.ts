/**
 * 网络请求监听器类型定义
 */

// 请求方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// 请求状态类型
export type RequestStatus = 'pending' | 'success' | 'error' | 'timeout'

// 网络请求记录接口
export interface NetworkRequest {
  id: string
  url: string
  method: HttpMethod
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
  isValidationError?: boolean  // 响应验证错误标记
}

// URL替换规则接口
export interface UrlReplaceRule {
  from: string
  to: string
  enabled: boolean
}

// 响应验证规则接口
export interface ResponseValidationRule {
  key: string
  expectedValue: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains'
  enabled: boolean
}

// 快速复制配置接口
export interface QuickCopyConfig {
  responseHeaderField: string  // 要复制的响应头字段名
  responseBodyField: string    // 要复制的响应体字段名
  enableDebugInfo: boolean     // 是否启用开发调试信息复制
}

// 域名配置接口
export interface DomainConfig {
  enabled: boolean  // 是否启用域名限制
  domains: string[] // 允许的域名列表，支持通配符
}

// 监听配置接口
export interface MonitorConfig {
  apiPrefixes: string[]  // 改为API前缀
  isActive: boolean
  includeSuccessRequests: boolean
  onlyRecordFetchXHR: boolean  // 新增：只记录 Fetch/XHR 请求
  maxRecords: number
  autoExport: boolean
  enableConsoleLog: boolean  // 新增：控制台输出配置
  urlReplaceRules: UrlReplaceRule[]  // URL替换规则
  responseValidationRules: ResponseValidationRule[]  // 响应验证规则
  quickCopyConfig: QuickCopyConfig  // 快速复制配置
  domainConfig: DomainConfig  // 新增：域名配置
  // 浮动侧边栏配置
  enableFloatingSidebar?: boolean  // 是否启用浮动侧边栏
  sidebarPosition?: 'left' | 'right'  // 侧边栏位置
  sidebarOpacity?: number  // 侧边栏透明度 (0.1-1.0)
  // 新悬浮球和DevTools侧边栏配置
  enableFloatingBall?: boolean  // 是否启用新悬浮球
  floatingBallPosition?: 'left' | 'right'  // 悬浮球位置
  devToolsSidebarWidth?: number  // DevTools侧边栏宽度
}

// 存储数据接口
export interface StorageData {
  config: MonitorConfig
  requests: NetworkRequest[]
  lastUpdated: number
}

// CURL生成选项接口
export interface CurlOptions {
  includeHeaders: boolean
  includeBody: boolean
  compressed: boolean
  followRedirects: boolean
}

// 消息类型定义
export interface Message {
  type: 'START_MONITORING' | 'STOP_MONITORING' | 'GET_REQUESTS' | 'CLEAR_REQUESTS' | 'EXPORT_DATA' | 'UPDATE_CONFIG'
  payload?: any
}

// 响应消息接口
export interface MessageResponse {
  success: boolean
  data?: any
  error?: string
}

// 统计信息接口
export interface RequestStats {
  total: number
  errors: number
  successRate: number
  averageResponseTime: number
  domains: Record<string, number>
  methods: Record<HttpMethod, number>
  statusCodes: Record<number, number>
}
