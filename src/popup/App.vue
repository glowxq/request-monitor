<template>
  <div class="network-monitor">
    <!-- 头部 -->
    <div class="header" :class="{ 'fully-collapsed': headerFullyCollapsed }">
      <!-- 完全折叠状态：只显示小点 -->
      <div v-if="headerFullyCollapsed" class="header-dot" @click="headerFullyCollapsed = false" title="展开网络请求监听器">
        <div class="dot-indicator">
          <el-icon><Monitor /></el-icon>
        </div>
      </div>

      <!-- 普通状态（展开或普通折叠） -->
      <div v-else>
        <div class="header-main">
          <div class="header-left">
            <div class="title-row">
              <h2 class="title">
                <el-icon><Monitor /></el-icon>
                网络请求监听器
              </h2>
              <div class="collapse-buttons">
                <el-button
                  class="collapse-btn"
                  size="small"
                  text
                  @click="requestsCollapsed = !requestsCollapsed"
                  :icon="requestsCollapsed ? ArrowDown : ArrowUp"
                  :title="requestsCollapsed ? '展开内容' : '普通折叠'"
                />
                <el-button
                  class="fully-collapse-btn"
                  size="small"
                  text
                  @click="headerFullyCollapsed = true"
                  :icon="Minus"
                  title="完全折叠为小点"
                />
              </div>
            </div>
          </div>
          <div class="header-right">
            <div class="status-indicator" :class="{ active: isMonitoring }">
              <el-icon><Connection /></el-icon>
              {{ isMonitoring ? '监听中' : '已停止' }}
            </div>
            <el-button
              class="floating-ball-btn"
              size="small"
              :type="config.enableFloatingBall ? 'success' : 'info'"
              @click="toggleFloatingBall"
              :icon="Position"
              :title="config.enableFloatingBall ? '关闭悬浮球' : '开启悬浮球'"
            >
              {{ config.enableFloatingBall ? '悬浮球' : '悬浮球' }}
            </el-button>
            <el-button
              class="fullscreen-btn"
              size="small"
              type="success"
              @click="openFullscreenPage"
              :icon="FullScreen"
            >
              全屏界面
            </el-button>
            <el-button
              class="contact-btn"
              size="small"
              type="primary"
              @click="openContactPage"
              :icon="ChatDotRound"
            >
              联系我
            </el-button>
          </div>
        </div>

        <!-- 统计数据 -->
        <div v-show="!requestsCollapsed && requests.length > 0" class="header-stats">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ requests.length }}</span>
              <span class="stat-label">总请求</span>
            </div>
            <div class="stat-item error">
              <span class="stat-value">{{ errorCount }}</span>
              <span class="stat-label">错误</span>
            </div>
            <div class="stat-item validation-error">
              <span class="stat-value">{{ validationErrorCount }}</span>
              <span class="stat-label">验证异常</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ successRate }}%</span>
              <span class="stat-label">成功率</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ averageResponseTime }}ms</span>
              <span class="stat-label">平均响应</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮区域 -->
        <div v-show="!requestsCollapsed" class="top-actions-section">
          <div class="action-buttons-row">
            <el-button
              :type="config.isActive ? 'danger' : ''"
              @click="toggleMonitoring"
              :loading="isLoading"
              size="small"
              class="primary-action-btn"
            >
              <el-icon><VideoPlay v-if="!config.isActive" /><VideoPause v-if="config.isActive" /></el-icon>
              {{ config.isActive ? '停止监听' : '开始监听' }}
            </el-button>

            <el-button @click="clearRequests" size="small" :disabled="requests.length === 0" class="secondary-action-btn">
              <el-icon><Delete /></el-icon>
              清空记录
            </el-button>

            <el-button @click="exportData" size="small" :disabled="requests.length === 0" class="secondary-action-btn">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>

            <el-button @click="exportConfig" size="small" class="secondary-action-btn">
              <el-icon><Upload /></el-icon>
              导出配置
            </el-button>

            <el-button @click="showImportDialog = true" size="small" class="secondary-action-btn">
              <el-icon><FolderOpened /></el-icon>
              导入配置
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 配置区域 -->
    <div class="config-section" :class="{ 'fully-collapsed': configFullyCollapsed }">
      <!-- 完全折叠状态：只显示小点 -->
      <div v-if="configFullyCollapsed" class="config-dot" @click="configFullyCollapsed = false" title="展开监听配置">
        <div class="dot-indicator">
          <el-icon><Setting /></el-icon>
        </div>
      </div>

      <!-- 普通状态（展开或普通折叠） -->
      <div v-else>
        <div class="section-header" @click="configCollapsed = !configCollapsed">
          <div class="section-title">
            <el-icon><Setting /></el-icon>
            <span>监听配置</span>
          </div>
          <div class="collapse-buttons">
            <el-button
              class="collapse-btn"
              size="small"
              text
              @click.stop="configCollapsed = !configCollapsed"
              :icon="configCollapsed ? ArrowDown : ArrowUp"
              :title="configCollapsed ? '展开配置' : '普通折叠'"
            />
            <el-button
              class="fully-collapse-btn"
              size="small"
              text
              @click.stop="configFullyCollapsed = true"
              :icon="Minus"
              title="完全折叠为小点"
            />
          </div>
        </div>

      <div v-show="!configCollapsed" class="config-content">
        <div class="config-form">
          <!-- 域名配置 -->
          <div class="form-section">
            <div class="section-label">
              域名限制配置
              <el-tooltip
                placement="top"
                effect="dark"
                :show-after="300"
              >
                <template #content>
                  <div class="tooltip-content">
                    <div class="tooltip-title">域名限制配置</div>
                    <div class="tooltip-desc">
                      配置插件生效的域名范围，只在指定域名的网站上监听网络请求。启用后可以避免插件影响其他网站的正常使用。
                    </div>
                    <div class="tooltip-examples">
                      <div class="example-title">示例：</div>
                      <div class="example-item">• example.com - 只在example.com域名生效</div>
                      <div class="example-item">• *.example.com - 在所有example.com的子域名生效</div>
                      <div class="example-item">• localhost - 在本地开发环境生效</div>
                    </div>
                    <div class="tooltip-tips">
                      <div class="tips-title">提示：</div>
                      <div class="tips-item">• 支持通配符 * 匹配子域名</div>
                      <div class="tips-item">• 不启用时插件在所有网站生效</div>
                      <div class="tips-item">• 建议启用以提高浏览器性能</div>
                    </div>
                  </div>
                </template>
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="domain-config-container">
              <div class="domain-enable-row">
                <el-checkbox v-model="config.domainConfig.enabled" size="large" class="domain-enable-checkbox">
                  启用域名限制
                </el-checkbox>
                <span class="domain-enable-desc">
                  {{ config.domainConfig.enabled ? '插件只在指定域名生效' : '插件在所有网站生效' }}
                </span>
              </div>
              <div v-show="config.domainConfig.enabled" class="domain-list-container">
                <el-tag
                  v-for="(domain, index) in config.domainConfig.domains"
                  :key="index"
                  closable
                  :disable-transitions="false"
                  @close="removeDomain(index)"
                  class="domain-tag"
                  :class="{ 'invalid': !isValidDomain(domain) }"
                >
                  {{ domain }}
                </el-tag>
                <el-input
                  v-if="domainInputVisible"
                  ref="domainInputRef"
                  v-model="domainInputValue"
                  class="domain-input"
                  size="small"
                  @keyup.enter="handleDomainInputConfirm"
                  @blur="handleDomainInputConfirm"
                  placeholder="输入域名后按回车，如: *.example.com"
                />
                <el-button v-else class="button-new-domain" size="small" @click="showDomainInput">
                  + 添加域名
                </el-button>
              </div>
            </div>
          </div>

          <!-- API前缀配置 -->
          <div class="form-section">
            <div class="section-label">
              监听API前缀
              <el-tooltip
                placement="top"
                effect="dark"
                :show-after="300"
              >
                <template #content>
                  <div class="tooltip-content">
                    <div class="tooltip-title">监听API前缀配置</div>
                    <div class="tooltip-desc">
                      配置需要监听的API前缀地址，只有匹配这些前缀的请求才会被记录和分析。支持多个前缀同时监听。
                    </div>
                    <div class="tooltip-examples">
                      <div class="example-title">示例：</div>
                      <div class="example-item">• https://api.example.com</div>
                      <div class="example-item">• https://service.company.com/api</div>
                      <div class="example-item">• http://localhost:3000/api</div>
                      <div class="example-item">• *.example.com - 通配符匹配所有子域名</div>
                      <div class="example-item">• *.example.com/store-service - 匹配特定路径</div>
                    </div>
                    <div class="tooltip-tips">
                      <div class="tips-title">提示：</div>
                      <div class="tips-item">• 支持HTTP和HTTPS协议</div>
                      <div class="tips-item">• 可以包含路径部分</div>
                      <div class="tips-item">• 支持通配符 * 匹配子域名</div>
                      <div class="tips-item">• 建议添加具体的API路径前缀</div>
                    </div>
                  </div>
                </template>
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="prefixes-input-container">
              <el-tag
                v-for="(prefix, index) in config.apiPrefixes"
                :key="index"
                closable
                :disable-transitions="false"
                @close="removeApiPrefix(index)"
                class="prefix-tag"
                :class="{ 'invalid': !isValidApiPrefix(prefix) }"
              >
                {{ prefix }}
              </el-tag>
              <el-input
                v-if="inputVisible"
                ref="inputRef"
                v-model="inputValue"
                class="prefix-input"
                size="small"
                @keyup.enter="handleInputConfirm"
                @blur="handleInputConfirm"
                placeholder="输入API前缀后按回车，如: *.example.com"
              />
              <el-button v-else class="button-new-tag" size="small" @click="showInput">
                + 添加API前缀
              </el-button>
            </div>
          </div>

          <!-- URL替换规则 -->
          <div class="form-section">
            <div class="section-label">
              URL替换规则
              <el-tooltip
                placement="top"
                effect="dark"
                :show-after="300"
              >
                <template #content>
                  <div class="tooltip-content">
                    <div class="tooltip-title">URL替换规则配置</div>
                    <div class="tooltip-desc">
                      将监听到的请求URL进行替换，便于本地调试。支持将生产环境的API地址替换为本地开发环境地址。
                    </div>
                    <div class="tooltip-examples">
                      <div class="example-title">示例：</div>
                      <div class="example-item">
                        <strong>原前缀：</strong> https://api.prod.com/v1<br/>
                        <strong>替换为：</strong> http://localhost:8080/api
                      </div>
                      <div class="example-item">
                        <strong>原前缀：</strong> https://service.example.com<br/>
                        <strong>替换为：</strong> http://127.0.0.1:3000
                      </div>
                    </div>
                    <div class="tooltip-tips">
                      <div class="tips-title">使用场景：</div>
                      <div class="tips-item">• 本地开发环境调试</div>
                      <div class="tips-item">• 测试环境切换</div>
                      <div class="tips-item">• API代理和转发</div>
                    </div>
                  </div>
                </template>
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="url-replace-rules">
              <div
                v-for="(rule, index) in config.urlReplaceRules"
                :key="index"
                class="rule-item"
              >
                <el-checkbox v-model="rule.enabled" size="large" class="rule-checkbox" />
                <el-tooltip
                  :content="rule.from || '原前缀'"
                  placement="top"
                  effect="dark"
                  :show-after="500"
                >
                  <el-input
                    v-model="rule.from"
                    placeholder="原前缀"
                    size="small"
                    class="rule-input"
                    clearable
                  />
                </el-tooltip>
                <span class="arrow">→</span>
                <el-tooltip
                  :content="rule.to || '替换为'"
                  placement="top"
                  effect="dark"
                  :show-after="500"
                >
                  <el-input
                    v-model="rule.to"
                    placeholder="替换为"
                    size="small"
                    class="rule-input"
                    clearable
                  />
                </el-tooltip>
                <el-button
                  size="small"
                  type="danger"
                  text
                  @click="removeUrlRule(index)"
                  :icon="Delete"
                />
              </div>
              <el-button size="small" @click="addUrlRule" class="add-rule-btn">
                + 添加规则
              </el-button>
            </div>
          </div>

          <!-- 响应验证规则 -->
          <div class="form-section">
            <div class="section-label">
              响应验证规则
              <el-tooltip
                placement="top"
                effect="dark"
                :show-after="300"
              >
                <template #content>
                  <div class="tooltip-content">
                    <div class="tooltip-title">响应验证规则配置</div>
                    <div class="tooltip-desc">
                      检查API响应内容，当响应不符合预期规则时标记为验证异常。支持对JSON响应字段进行条件判断。
                    </div>
                    <div class="tooltip-examples">
                      <div class="example-title">示例配置：</div>
                      <div class="example-item">
                        <strong>字段名：</strong> code<br/>
                        <strong>操作符：</strong> 等于<br/>
                        <strong>期望值：</strong> 0<br/>
                        <strong>含义：</strong> 当响应中code字段等于0时正常，不等于0时标记为异常
                      </div>
                      <div class="example-item">
                        <strong>字段名：</strong> status<br/>
                        <strong>操作符：</strong> 包含<br/>
                        <strong>期望值：</strong> success<br/>
                        <strong>含义：</strong> 当响应中status字段不包含"success"时标记为异常
                      </div>
                    </div>
                    <div class="tooltip-tips">
                      <div class="tips-title">操作符说明（正常响应规则）：</div>
                      <div class="tips-item">• <strong>等于：</strong> 只有当字段值等于期望值时才正常，其他值都标记为异常</div>
                      <div class="tips-item">• <strong>不等于：</strong> 只有当字段值不等于期望值时才正常，等于时标记为异常</div>
                      <div class="tips-item">• <strong>包含：</strong> 只有当字段值包含期望值时才正常，不包含时标记为异常</div>
                      <div class="tips-item">• <strong>不包含：</strong> 只有当字段值不包含期望值时才正常，包含时标记为异常</div>
                      <div class="tips-example">
                        <strong>示例：</strong> 配置"code 等于 0"，只有当接口返回code=0时正常，返回code=1或其他值时标记为异常
                      </div>
                    </div>
                  </div>
                </template>
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="response-validation-rules">
              <div
                v-for="(rule, index) in config.responseValidationRules"
                :key="index"
                class="rule-item"
              >
                <el-checkbox v-model="rule.enabled" size="large" class="rule-checkbox" />
                <el-tooltip
                  :content="rule.key || '字段名'"
                  placement="top"
                  effect="dark"
                  :show-after="500"
                >
                  <el-input
                    v-model="rule.key"
                    placeholder="字段名"
                    size="small"
                    class="rule-input rule-input--equal"
                    clearable
                  />
                </el-tooltip>
                <el-tooltip
                  :content="getOperatorLabel(rule.operator) || '操作符'"
                  placement="top"
                  effect="dark"
                  :show-after="500"
                >
                  <el-select
                    v-model="rule.operator"
                    size="small"
                    class="rule-select rule-select--equal"
                    clearable
                  >
                    <el-option label="等于" value="equals" />
                    <el-option label="不等于" value="not_equals" />
                    <el-option label="包含" value="contains" />
                    <el-option label="不包含" value="not_contains" />
                  </el-select>
                </el-tooltip>
                <el-tooltip
                  :content="rule.expectedValue || '期望值'"
                  placement="top"
                  effect="dark"
                  :show-after="500"
                >
                  <el-input
                    v-model="rule.expectedValue"
                    placeholder="期望值"
                    size="small"
                    class="rule-input rule-input--equal"
                    clearable
                  />
                </el-tooltip>
                <el-button
                  size="small"
                  type="danger"
                  text
                  @click="removeValidationRule(index)"
                  :icon="Delete"
                />
              </div>
              <el-button size="small" @click="addValidationRule" class="add-rule-btn">
                + 添加验证规则
              </el-button>
            </div>
          </div>

          <!-- 快速复制配置 -->
          <div class="form-section">
            <div class="section-label">
              快速复制配置
              <el-tooltip
                placement="top"
                effect="dark"
                :show-after="300"
              >
                <template #content>
                  <div class="tooltip-content">
                    <div class="tooltip-title">快速复制配置</div>
                    <div class="tooltip-desc">
                      配置开发调试信息的复制功能，一键复制页面URL、requestId、x-trace-id和curl命令等调试信息。
                    </div>
                    <div class="tooltip-examples">
                      <div class="example-title">功能说明：</div>
                      <div class="example-item">
                        <strong>开发调试信息：</strong><br/>
                        • 自动复制当前页面URL<br/>
                        • 自动复制响应头中的追踪ID<br/>
                        • 自动复制响应体中的请求ID<br/>
                        • 自动复制完整的CURL命令
                      </div>
                    </div>
                    <div class="tooltip-tips">
                      <div class="tips-title">使用提示：</div>
                      <div class="tips-item">• 启用后会在请求记录中显示"复制调试信息"按钮</div>
                      <div class="tips-item">• 复制的信息格式化为便于调试的文本</div>
                    </div>
                  </div>
                </template>
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="quick-copy-config">
              <div class="config-row">
                <div class="config-item">
                  <label class="config-label">响应头字段</label>
                  <el-input
                    v-model="config.quickCopyConfig.responseHeaderField"
                    placeholder="如：X-Trace-Id"
                    size="small"
                    clearable
                    class="config-input"
                  />
                </div>
                <div class="config-item">
                  <label class="config-label">响应体字段</label>
                  <el-input
                    v-model="config.quickCopyConfig.responseBodyField"
                    placeholder="如：requestId"
                    size="small"
                    clearable
                    class="config-input"
                  />
                </div>
              </div>
              <div class="config-row">
                <div class="config-item full-width">
                  <el-checkbox
                    v-model="config.quickCopyConfig.enableDebugInfo"
                    size="small"
                  >
                    启用开发调试信息复制
                  </el-checkbox>
                  <div class="config-desc">
                    启用后将显示"复制调试信息"按钮，一键复制页面URL、requestId、x-trace-id和curl命令
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 其他配置选项 -->
          <div class="form-section">
            <div class="section-label">
              其他配置
              <el-tooltip
                placement="top"
                effect="dark"
                :show-after="300"
              >
                <template #content>
                  <div class="tooltip-content">
                    <div class="tooltip-title">其他配置选项</div>
                    <div class="tooltip-desc">
                      配置插件的其他选项，包括请求记录行为和存储限制等设置。
                    </div>
                    <div class="tooltip-examples">
                      <div class="example-title">配置说明：</div>
                      <div class="example-item">
                        <strong>记录成功请求：</strong><br/>
                        • 开启：记录所有匹配的请求（包括成功的）<br/>
                        • 关闭：只记录错误请求和验证异常请求
                      </div>
                      <div class="example-item">
                        <strong>只记录 Fetch/XHR：</strong><br/>
                        • 开启：只监听和记录 Fetch API 和 XMLHttpRequest 请求<br/>
                        • 关闭：记录所有类型的网络请求（包括图片、CSS等资源）
                      </div>
                      <div class="example-item">
                        <strong>最大记录数：</strong><br/>
                        • 限制内存中保存的请求记录数量<br/>
                        • 超出限制时自动删除最旧的记录<br/>
                        • 建议范围：10-1000条
                      </div>
                    </div>
                    <div class="tooltip-tips">
                      <div class="tips-title">性能建议：</div>
                      <div class="tips-item">• 大量请求时建议关闭"记录成功请求"</div>
                      <div class="tips-item">• 根据内存情况调整最大记录数</div>
                    </div>
                  </div>
                </template>
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="other-options">
              <div class="option-row">
                <el-checkbox v-model="config.includeSuccessRequests" size="large" class="success-checkbox">
                  记录成功请求
                </el-checkbox>
              </div>
              <div class="option-row">
                <el-checkbox v-model="config.onlyRecordFetchXHR" size="large" class="success-checkbox">
                  只记录 Fetch/XHR
                </el-checkbox>
              </div>
              <div class="option-row">
                <el-checkbox v-model="config.enableConsoleLog" size="large" class="success-checkbox">
                  控制台输出
                </el-checkbox>
              </div>
              <div class="option-row">
                <span class="option-label">最大记录数</span>
                <el-input-number
                  v-model="config.maxRecords"
                  :min="10"
                  :max="1000"
                  size="small"
                  controls-position="right"
                  class="max-records-input"
                />
              </div>
            </div>
          </div>


        </div>
      </div>
      </div>
    </div>



    <!-- 请求列表 -->
    <div class="requests-section">
      <div class="section-header">
        <div class="header-top">
          <div class="section-title" @click="requestsListCollapsed = !requestsListCollapsed">
            <el-icon><List /></el-icon>
            <span>请求记录 ({{ requests.length }})</span>
            <el-button
              class="collapse-btn"
              size="small"
              text
              :icon="requestsListCollapsed ? ArrowDown : ArrowUp"
            />
          </div>
          <div v-show="!requestsListCollapsed" class="filter-tabs">
            <el-button
              :class="['filter-tab', 'filter-tab--problem', { active: filter === 'problem' }]"
              @click="filter = 'problem'"
              size="small"
            >
              问题接口
            </el-button>
            <el-button
              :class="['filter-tab', 'filter-tab--all', { active: filter === 'all' }]"
              @click="filter = 'all'"
              size="small"
            >
              全部
            </el-button>
            <el-button
              :class="['filter-tab', 'filter-tab--error', { active: filter === 'error' }]"
              @click="filter = 'error'"
              size="small"
            >
              错误
            </el-button>
            <el-button
              :class="['filter-tab', 'filter-tab--validation', { active: filter === 'validation' }]"
              @click="filter = 'validation'"
              size="small"
            >
              验证异常
            </el-button>
          </div>
        </div>

        <!-- 搜索过滤区域 -->
        <div v-show="!requestsListCollapsed" class="search-filter-section">
          <div class="search-input-container">
            <el-input
              v-model="searchQuery"
              placeholder="搜索请求记录（URL、方法、状态码、域名）"
              size="small"
              clearable
              class="search-input"
              :prefix-icon="Search"
              @clear="clearSearch"
            />
            <el-button
              v-if="searchQuery"
              size="small"
              text
              @click="clearSearch"
              class="clear-search-btn"
            >
              清空
            </el-button>
          </div>

          <!-- 快速过滤按钮 -->
          <div class="quick-filters" v-if="requests.length > 0">
            <span class="quick-filter-label">快速过滤：</span>
            <el-button
              v-for="method in uniqueMethods"
              :key="method"
              size="small"
              plain
              @click="setQuickFilter('method', method)"
              class="quick-filter-btn"
              :class="{ active: searchQuery === method }"
            >
              {{ method }}
            </el-button>
            <el-button
              v-for="domain in uniqueDomains.slice(0, 3)"
              :key="domain"
              size="small"
              plain
              @click="setQuickFilter('domain', domain)"
              class="quick-filter-btn"
              :class="{ active: searchQuery === domain }"
            >
              {{ domain }}
            </el-button>
          </div>
        </div>
      </div>

      <div v-show="!requestsListCollapsed" class="requests-content">
        <!-- 搜索结果统计 -->
        <div v-if="searchQuery && filteredRequests.length !== requests.length" class="search-results-info">
          <el-icon><Search /></el-icon>
          <span>找到 {{ filteredRequests.length }} 条匹配记录</span>
          <el-button size="small" text @click="clearSearch">清空搜索</el-button>
        </div>

        <div class="requests-list" v-if="filteredRequests.length > 0">
          <div
            v-for="request in filteredRequests"
            :key="request.id"
            class="request-item"
            :class="{
              error: request.isError,
              'validation-error': request.isValidationError
            }"
          >
          <div class="request-header" @click="selectedRequest = request">
            <span class="method" :class="request.method.toLowerCase()">
              {{ request.method }}
            </span>
            <span class="status" :class="{ error: request.isError }">
              {{ request.status }}
              <el-tag
                v-if="request.isValidationError"
                size="small"
                type="warning"
                class="validation-tag"
              >
                验证失败
              </el-tag>
            </span>
            <span class="url">{{ getShortUrl(request.url) }}</span>
            <span class="time">{{ formatDuration(request.duration) }}</span>
          </div>
          <div class="request-meta">
            <span class="timestamp">{{ formatTimestamp(request.timestamp) }}</span>
            <div class="request-actions">
              <el-button
                size="small"
                type="success"
                :icon="VideoPlay"
                @click.stop="sendCurlRequest(request)"
                class="send-btn"
                :loading="sendingRequests.has(request.id)"
              >
                发送请求
              </el-button>
              <el-button
                size="small"
                type="primary"
                :icon="CopyDocument"
                @click.stop="quickCopyCurl(request)"
                class="curl-btn"
              >
                复制CURL
              </el-button>

              <!-- 复制开发调试信息按钮 -->
              <el-button
                v-if="config.quickCopyConfig.enableDebugInfo"
                size="small"
                type="primary"
                :icon="CopyDocument"
                @click.stop="quickCopyDebugInfo(request)"
                class="quick-copy-btn"
                title="复制开发调试信息（页面URL、requestId、x-trace-id、curl）"
              >
                复制调试信息
              </el-button>
            </div>
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
            请添加API前缀并开始监听
          </p>
        </div>
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

    <!-- 联系我弹窗 -->
    <ContactDialog v-model="showContactDialog" />

    <!-- 导入配置对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入配置"
      width="550px"
      :before-close="handleImportDialogClose"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      append-to-body
      class="import-config-dialog"
      :destroy-on-close="false"
      :modal="true"
      :lock-scroll="false"
    >
      <div class="import-config-content">
        <el-tabs v-model="importMethod" class="import-tabs">
          <el-tab-pane label="JSON粘贴" name="json">
            <div class="import-section">
              <el-input
                v-model="importJsonText"
                type="textarea"
                :rows="8"
                placeholder="请粘贴JSON配置内容"
                class="json-textarea"
              />
              <div class="import-tips">
                <el-icon><InfoFilled /></el-icon>
                <span>直接粘贴JSON格式的配置内容</span>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="文件上传" name="file">
            <div class="import-section">
              <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :show-file-list="false"
                accept=".json"
                :on-change="handleFileChange"
                drag
                class="config-upload"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">
                  将JSON配置文件拖拽到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    只能上传JSON格式的配置文件
                  </div>
                </template>
              </el-upload>
            </div>
          </el-tab-pane>

          <el-tab-pane label="URL订阅" name="url">
            <div class="import-section">
              <el-input
                v-model="importUrl"
                placeholder="请输入配置文件的URL地址"
                clearable
                class="import-input"
              >
                <template #prepend>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
              <div class="import-tips">
                <el-icon><InfoFilled /></el-icon>
                <span>支持HTTP/HTTPS链接，将自动下载JSON配置文件</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button type="primary" @click="importConfig" :loading="importLoading">
            导入配置
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  Check,
  VideoPlay,
  VideoPause,
  Delete,
  Download,
  DocumentRemove,
  Connection,
  CopyDocument,
  ChatDotRound,
  ArrowDown,
  ArrowUp,
  Setting,
  Key,
  Close,
  Search,
  Remove,
  Edit,
  Plus,
  InfoFilled,
  List,
  Link,
  UploadFilled,
  Upload,
  FolderOpened,
  FullScreen,
  Position,
  Minus
} from '@element-plus/icons-vue'

import type { NetworkRequest, MonitorConfig, ResponseValidationRule } from '@/types'
import { isValidDomain, isValidApiPrefix, formatTimestamp, formatDuration, copyToClipboard, exportToJson, generateCurl, sendCurlRequest as sendCurlRequestUtil, validateResponse } from '@/utils'
import RequestDetailDialog from './components/RequestDetailDialog.vue'
import ContactDialog from './components/ContactDialog.vue'

// 响应式数据
const isMonitoring = ref(false)
const requests = ref<NetworkRequest[]>([])
const selectedRequest = ref<NetworkRequest | null>(null)
const showDetailDialog = ref(false)
const filter = ref<'problem' | 'all' | 'error' | 'validation'>('problem')

// 搜索过滤相关
const searchQuery = ref('')

// 导入配置相关
const showImportDialog = ref(false)
const importMethod = ref<'url' | 'file' | 'json'>('json')
const importUrl = ref('')
const importJsonText = ref('')
const importLoading = ref(false)
const uploadRef = ref()

// 联系我弹窗
const showContactDialog = ref(false)

// 配置数据 - 移除默认配置，改为空配置
const config = ref<MonitorConfig>({
  apiPrefixes: [],
  isActive: false,
  includeSuccessRequests: true,  // 默认勾选记录成功请求
  onlyRecordFetchXHR: true,      // 默认只记录 Fetch/XHR
  maxRecords: 100,
  autoExport: false,
  enableConsoleLog: false,  // 新增：控制台输出配置，默认关闭
  urlReplaceRules: [],
  responseValidationRules: [],
  // 新增：快速复制配置
  quickCopyConfig: {
    responseHeaderField: 'X-Trace-Id',  // 默认复制的响应头字段
    responseBodyField: 'requestId',     // 默认复制的响应体字段
    enableDebugInfo: true               // 默认启用开发调试信息复制
  },
  // 新增：域名配置
  domainConfig: {
    enabled: true,   // 默认启用域名限制，更安全
    domains: []      // 默认空域名列表
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

// 域名输入相关
const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref()

// 域名配置输入相关
const domainInputVisible = ref(false)
const domainInputValue = ref('')
const domainInputRef = ref()

// 折叠状态
const headerFullyCollapsed = ref(false)  // 完全折叠网络请求监听器（小点状态）
const configFullyCollapsed = ref(false)  // 完全折叠监听配置（小点状态）
const configCollapsed = ref(true)  // 普通折叠监听配置
const requestsCollapsed = ref(false)  // 普通折叠网络请求监听器内容
const requestsListCollapsed = ref(false)

// 发送请求状态
const sendingRequests = ref(new Set<string>())

// 计算属性
const filteredRequests = computed(() => {
  // 首先根据配置过滤请求
  let baseRequests = requests.value
  if (!config.value.includeSuccessRequests) {
    // 如果不包含成功请求，只显示错误请求和验证异常请求
    baseRequests = requests.value.filter(req => req.isError || req.isValidationError)
  }

  // 然后根据tab过滤
  if (filter.value === 'problem') {
    // 问题接口：显示错误和验证异常的请求
    baseRequests = baseRequests.filter(req => req.isError || req.isValidationError)
  } else if (filter.value === 'error') {
    baseRequests = baseRequests.filter(req => req.isError && !req.isValidationError)
  } else if (filter.value === 'validation') {
    baseRequests = baseRequests.filter(req => req.isValidationError)
  }

  // 最后根据搜索查询过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    baseRequests = baseRequests.filter(req => {
      // 搜索URL
      if (req.url.toLowerCase().includes(query)) return true

      // 搜索请求方法
      if (req.method.toLowerCase().includes(query)) return true

      // 搜索状态码
      if (req.status.toString().includes(query)) return true

      // 搜索域名
      if (req.domain.toLowerCase().includes(query)) return true

      // 搜索状态文本
      if (req.statusText.toLowerCase().includes(query)) return true

      return false
    })
  }

  return baseRequests
})

// 获取唯一的请求方法列表
const uniqueMethods = computed(() => {
  const methods = [...new Set(requests.value.map(req => req.method))]
  return methods.sort()
})

// 获取唯一的域名列表
const uniqueDomains = computed(() => {
  const domains = [...new Set(requests.value.map(req => req.domain))]
  return domains.sort()
})

const errorCount = computed(() => {
  return requests.value.filter(req => req.isError && !req.isValidationError).length
})

const validationErrorCount = computed(() => {
  return requests.value.filter(req => req.isValidationError).length
})

const successRate = computed(() => {
  if (requests.value.length === 0) return 0
  const successCount = requests.value.length - errorCount.value - validationErrorCount.value
  return Math.round((successCount / requests.value.length) * 100)
})

const averageResponseTime = computed(() => {
  if (requests.value.length === 0) return 0
  const total = requests.value.reduce((sum, req) => sum + req.duration, 0)
  return Math.round(total / requests.value.length)
})

// 监听选中请求变化
watch(selectedRequest, (newRequest) => {
  if (newRequest) {
    showDetailDialog.value = true
  }
})

// 监听弹窗关闭
watch(showDetailDialog, (show) => {
  if (!show) {
    selectedRequest.value = null
  }
})

// 监听URL替换规则变化
watch(() => config.value.urlReplaceRules, async (newRules, oldRules) => {
  if (oldRules && newRules) {
    // 检查是否有规则的enabled状态发生变化
    const hasEnabledChange = newRules.some((rule, index) => {
      const oldRule = oldRules[index]
      return oldRule && (rule.enabled !== oldRule.enabled || rule.from !== oldRule.from || rule.to !== oldRule.to)
    })

    if (hasEnabledChange) {
      await updateConfig()
    }
  }
}, { deep: true })

// 监听响应验证规则变化
watch(() => config.value.responseValidationRules, async (newRules, oldRules) => {
  if (oldRules && newRules) {
    // 检查是否有规则的enabled状态发生变化
    const hasEnabledChange = newRules.some((rule, index) => {
      const oldRule = oldRules[index]
      return oldRule && (rule.enabled !== oldRule.enabled || rule.key !== oldRule.key ||
                        rule.expectedValue !== oldRule.expectedValue || rule.operator !== oldRule.operator)
    })

    if (hasEnabledChange) {
      await updateConfig()
    }
  }
}, { deep: true })

// 方法
// API前缀管理方法
const removeApiPrefix = (index: number) => {
  config.value.apiPrefixes.splice(index, 1)
}

const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleInputConfirm = () => {
  if (inputValue.value) {
    const prefix = inputValue.value.trim()
    if (isValidApiPrefix(prefix) && !config.value.apiPrefixes.includes(prefix)) {
      config.value.apiPrefixes.push(prefix)
    } else if (!isValidApiPrefix(prefix)) {
      ElMessage.error('请输入有效的API前缀格式，如: https://api.example.com')
    } else if (config.value.apiPrefixes.includes(prefix)) {
      ElMessage.warning('该API前缀已存在')
    }
  }
  inputVisible.value = false
  inputValue.value = ''
}

// 域名管理方法
const removeDomain = (index: number) => {
  config.value.domainConfig.domains.splice(index, 1)
}

const showDomainInput = () => {
  domainInputVisible.value = true
  nextTick(() => {
    domainInputRef.value?.focus()
  })
}

const handleDomainInputConfirm = () => {
  if (domainInputValue.value) {
    const domain = domainInputValue.value.trim()
    if (isValidDomain(domain) && !config.value.domainConfig.domains.includes(domain)) {
      config.value.domainConfig.domains.push(domain)
    } else if (!isValidDomain(domain)) {
      ElMessage.error('请输入有效的域名格式，如: *.example.com 或 example.com')
    } else if (config.value.domainConfig.domains.includes(domain)) {
      ElMessage.warning('该域名已存在')
    }
  }
  domainInputVisible.value = false
  domainInputValue.value = ''
}

// URL替换规则管理
const addUrlRule = async () => {
  config.value.urlReplaceRules.push({
    from: '',
    to: '',
    enabled: true
  })
  await updateConfig()
}

const removeUrlRule = async (index: number) => {
  config.value.urlReplaceRules.splice(index, 1)
  await updateConfig()
}

// 响应验证规则管理
const addValidationRule = async () => {
  config.value.responseValidationRules.push({
    key: '',
    expectedValue: '',
    operator: 'equals',
    enabled: true
  })
  await updateConfig()
}

const removeValidationRule = async (index: number) => {
  config.value.responseValidationRules.splice(index, 1)
  await updateConfig()
}

/**
 * 获取操作符的中文标签
 * @param operator 操作符值
 * @returns 对应的中文标签
 */
const getOperatorLabel = (operator: string): string => {
  const operatorMap: Record<string, string> = {
    'equals': '等于',
    'not_equals': '不等于',
    'contains': '包含',
    'not_contains': '不包含'
  }
  return operatorMap[operator] || operator
}

const toggleMonitoring = async () => {
  if (!config.value.apiPrefixes || config.value.apiPrefixes.length === 0) {
    ElMessage.error('请至少添加一个监听API前缀')
    return
  }

  // 验证所有API前缀格式
  const invalidPrefixes = config.value.apiPrefixes.filter(prefix => !isValidApiPrefix(prefix))
  if (invalidPrefixes.length > 0) {
    ElMessage.error(`以下API前缀格式无效: ${invalidPrefixes.join(', ')}`)
    return
  }

  try {
    if (isMonitoring.value) {
      // 停止监听
      const response = await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' })
      if (response && response.success) {
        isMonitoring.value = false
        config.value.isActive = false
        ElMessage.success('已停止监听')
      } else {
        throw new Error(response?.error || '停止监听失败')
      }
    } else {
      // 开始监听
      config.value.isActive = true
      const response = await chrome.runtime.sendMessage({
        type: 'START_MONITORING',
        payload: config.value
      })

      if (response && response.success) {
        isMonitoring.value = true
        ElMessage.success(`开始监听API前缀: ${config.value.apiPrefixes.join(', ')}`)

        // 自动折叠配置区域
        configCollapsed.value = true

        // 通知内容脚本更新监听API前缀
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (tab.id) {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'UPDATE_MONITORING_API_PREFIXES',
              payload: config.value.apiPrefixes
            })
          }
        } catch (error) {
          console.warn('无法向内容脚本发送消息:', error)
        }
      } else {
        throw new Error(response?.error || '开始监听失败')
      }
    }
  } catch (error) {
    console.error('监听操作错误:', error)
    ElMessage.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const clearRequests = async () => {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' })
    requests.value = []
    ElMessage.success('已清空请求记录')

    // 广播数据更新
    broadcastDataUpdate()
  } catch (error) {
    ElMessage.error('清空失败')
  }
}

// 更新配置到background
const updateConfig = async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_CONFIG',
      payload: config.value
    })

    if (!response || !response.success) {
      throw new Error(response?.error || '更新配置失败')
    }

    // 广播配置更新
    broadcastDataUpdate()
  } catch (error) {
    console.error('更新配置失败:', error)
    ElMessage.error('配置更新失败')
  }
}

const exportData = () => {
  const data = {
    config: config.value,
    requests: requests.value,
    exportTime: new Date().toISOString(),
    stats: {
      total: requests.value.length,
      errors: errorCount.value,
      successRate: successRate.value,
      averageResponseTime: averageResponseTime.value
    }
  }

  const filename = `network-requests-${new Date().toISOString().split('T')[0]}.json`
  exportToJson(data, filename)
  ElMessage.success('数据已导出')
}

// 导出配置
const exportConfig = () => {
  const configData = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    config: {
      apiPrefixes: config.value.apiPrefixes,
      includeSuccessRequests: config.value.includeSuccessRequests,
      onlyRecordFetchXHR: config.value.onlyRecordFetchXHR,
      maxRecords: config.value.maxRecords,
      autoExport: config.value.autoExport,
      enableConsoleLog: config.value.enableConsoleLog,
      urlReplaceRules: config.value.urlReplaceRules,
      responseValidationRules: config.value.responseValidationRules,
      quickCopyConfig: config.value.quickCopyConfig,
      domainConfig: config.value.domainConfig
    }
  }

  const filename = `network-monitor-config-${new Date().toISOString().split('T')[0]}.json`
  exportToJson(configData, filename)
  ElMessage.success('配置已导出')
}

// 导入配置
const importConfig = async () => {
  importLoading.value = true

  try {
    let configData: any = null

    if (importMethod.value === 'url') {
      if (!importUrl.value.trim()) {
        ElMessage.error('请输入配置文件URL')
        return
      }

      try {
        const response = await fetch(importUrl.value)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        configData = await response.json()
      } catch (error) {
        ElMessage.error(`URL下载失败: ${error.message}`)
        return
      }
    } else if (importMethod.value === 'json') {
      if (!importJsonText.value.trim()) {
        ElMessage.error('请输入JSON配置内容')
        return
      }

      try {
        configData = JSON.parse(importJsonText.value)
      } catch (error) {
        ElMessage.error('JSON格式错误，请检查配置内容')
        return
      }
    }

    if (!configData) {
      ElMessage.error('没有可导入的配置数据')
      return
    }

    // 验证配置格式
    if (!configData.config) {
      ElMessage.error('配置文件格式错误：缺少config字段')
      return
    }

    const importedConfig = configData.config

    // 应用配置
    config.value.apiPrefixes = importedConfig.apiPrefixes || []
    config.value.includeSuccessRequests = importedConfig.includeSuccessRequests !== undefined ? importedConfig.includeSuccessRequests : true
    config.value.onlyRecordFetchXHR = importedConfig.onlyRecordFetchXHR !== undefined ? importedConfig.onlyRecordFetchXHR : true
    config.value.maxRecords = importedConfig.maxRecords || 100
    config.value.autoExport = importedConfig.autoExport || false
    config.value.enableConsoleLog = importedConfig.enableConsoleLog !== undefined ? importedConfig.enableConsoleLog : false
    config.value.urlReplaceRules = importedConfig.urlReplaceRules || []
    config.value.responseValidationRules = importedConfig.responseValidationRules || []
    config.value.quickCopyConfig = importedConfig.quickCopyConfig || {
      responseHeaderField: 'X-Trace-Id',
      responseBodyField: 'requestId',
      enableDebugInfo: true
    }
    config.value.domainConfig = importedConfig.domainConfig || {
      enabled: true,  // 默认启用域名限制
      domains: []
    }

    // 保存配置
    await chrome.storage.local.set({ config: config.value })

    // 更新background script配置
    await updateConfig()

    // 关闭对话框并重置
    showImportDialog.value = false
    importUrl.value = ''
    importJsonText.value = ''

    ElMessage.success('配置导入成功')
  } catch (error) {
    console.error('导入配置失败:', error)
    ElMessage.error('导入配置失败')
  } finally {
    importLoading.value = false
  }
}

// 处理文件上传
const handleFileChange = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      importJsonText.value = content
      importMethod.value = 'json'
      ElMessage.success('文件读取成功，请点击导入配置')
    } catch (error) {
      ElMessage.error('文件读取失败')
    }
  }
  reader.readAsText(file.raw)
}

// 关闭导入对话框
const handleImportDialogClose = () => {
  showImportDialog.value = false
  importUrl.value = ''
  importJsonText.value = ''
  importMethod.value = 'url'
}

const getShortUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname + urlObj.search
    return path.length > 40 ? path.substring(0, 37) + '...' : path
  } catch {
    return url.length > 40 ? url.substring(0, 37) + '...' : url
  }
}

const handleCopyCurl = async (curlCommand: string) => {
  const success = await copyToClipboard(curlCommand)
  if (success) {
    ElMessage.success('CURL命令已复制到剪贴板')
  } else {
    ElMessage.error('复制失败')
  }
}

const handleCopyResponse = async (response: string) => {
  const success = await copyToClipboard(response)
  if (success) {
    ElMessage.success('响应内容已复制到剪贴板')
  } else {
    ElMessage.error('复制失败')
  }
}

const handleSendCurl = async (curlCommand: string) => {
  if (!selectedRequest.value) return
  await sendCurlRequest(selectedRequest.value)
}

const quickCopyCurl = async (request: NetworkRequest) => {
  try {
    console.log('正在生成CURL命令，请求数据:', request)
    console.log('请求体内容:', request.requestBody)
    console.log('请求方法:', request.method)

    // 检查请求数据的完整性
    if (!request || !request.url) {
      throw new Error('请求数据不完整：缺少URL')
    }

    if (!request.method) {
      throw new Error('请求数据不完整：缺少请求方法')
    }

    const curlCommand = generateCurl(request, {
      includeHeaders: true,
      includeBody: true,
      compressed: true,
      followRedirects: true
    }, config.value.urlReplaceRules)

    console.log('生成的CURL命令:', curlCommand)

    if (!curlCommand || curlCommand.trim() === '') {
      throw new Error('生成的CURL命令为空')
    }

    const success = await copyToClipboard(curlCommand)
    if (success) {
      ElMessage.success('CURL命令已复制到剪贴板')
    } else {
      ElMessage.error('复制到剪贴板失败')
    }
  } catch (error) {
    console.error('生成CURL命令失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`生成CURL命令失败: ${errorMessage}`)
  }
}

// 获取当前活动标签页的URL
const getCurrentPageUrl = async (): Promise<string> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab.url || '未知页面'
  } catch (error) {
    console.error('获取当前页面URL失败:', error)
    return '获取页面URL失败'
  }
}

// 复制开发调试信息
const quickCopyDebugInfo = async (request: NetworkRequest) => {
  try {
    // 获取当前页面URL
    const pageUrl = await getCurrentPageUrl()

    // 获取响应头字段值
    const headerField = config.value.quickCopyConfig.responseHeaderField
    const headerValue = headerField ? Object.entries(request.responseHeaders).find(
      ([key]) => key.toLowerCase() === headerField.toLowerCase()
    )?.[1] || '未找到' : '未配置'

    // 获取响应体字段值
    const bodyField = config.value.quickCopyConfig.responseBodyField
    let bodyFieldValue = '未找到'
    if (bodyField && request.responseBody) {
      try {
        const responseData = JSON.parse(request.responseBody)
        const fieldValue = getNestedValue(responseData, bodyField)
        bodyFieldValue = fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '未找到'
      } catch (error) {
        bodyFieldValue = '解析失败'
      }
    }

    // 生成CURL命令
    let curlCommand = '生成失败'
    try {
      curlCommand = generateCurl(request, {
        includeHeaders: true,
        includeBody: true,
        compressed: true,
        followRedirects: true
      }, config.value.urlReplaceRules)
    } catch (error) {
      console.error('生成CURL命令失败:', error)
    }

    // 格式化调试信息
    const debugInfo = `=== 开发调试信息 ===
页面URL: ${pageUrl}
${headerField}: ${headerValue}
${bodyField}: ${bodyFieldValue}

=== CURL命令 ===
${curlCommand}

=== 请求详情 ===
请求URL: ${request.url}
请求方法: ${request.method}
响应状态: ${request.status} ${request.statusText}
请求时间: ${new Date(request.timestamp).toLocaleString()}
响应时长: ${request.duration}ms
`

    const success = await copyToClipboard(debugInfo)
    if (success) {
      ElMessage.success('开发调试信息已复制到剪贴板')
    } else {
      ElMessage.error('复制到剪贴板失败')
    }
  } catch (error) {
    console.error('复制调试信息失败:', error)
    ElMessage.error('复制调试信息失败')
  }
}

// 获取嵌套对象的值
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

// 发送CURL请求
const sendCurlRequest = async (request: NetworkRequest) => {
  if (sendingRequests.value.has(request.id)) {
    return // 防止重复发送
  }

  sendingRequests.value.add(request.id)

  try {
    const result = await sendCurlRequestUtil(request, config.value.urlReplaceRules)

    if (result.success) {
      ElMessage.success(`请求成功 - 状态码: ${result.status} - 耗时: ${result.duration}ms`)

      // 可以选择显示响应内容
      if (result.responseBody) {
        console.log('响应内容:', result.responseBody)
      }
    } else {
      ElMessage.error(`请求失败: ${result.error}`)
    }
  } catch (error) {
    console.error('发送请求失败:', error)
    ElMessage.error('发送请求失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    sendingRequests.value.delete(request.id)
  }
}

const openContactPage = () => {
  showContactDialog.value = true
}

// 切换悬浮球状态
const toggleFloatingBall = async () => {
  const newState = !config.value.enableFloatingBall
  config.value.enableFloatingBall = newState

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
        message: '悬浮球已启用，将在所有网页上显示',
        duration: 500
      })
    } else {
      ElMessage.info({
        message: '悬浮球已关闭',
        duration: 500
      })
    }
  } catch (error) {
    console.error('更新悬浮球配置失败:', error)
    ElMessage.error({
      message: '配置更新失败，请重试',
      duration: 500
    })
  }
}

// 打开全屏界面
const openFullscreenPage = () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('standalone.html')
  })
}

// 搜索过滤相关方法
const clearSearch = () => {
  searchQuery.value = ''
}

const setQuickFilter = (type: string, value: string) => {
  if (searchQuery.value === value) {
    // 如果已经是当前搜索，则清空搜索
    clearSearch()
  } else {
    // 设置新的搜索查询
    searchQuery.value = value
  }
}

const loadRequests = async () => {
  try {
    console.log('正在加载请求记录...')
    const response = await chrome.runtime.sendMessage({ type: 'GET_REQUESTS' })
    console.log('加载请求记录响应:', response)
    if (response && response.success) {
      requests.value = response.data || []
      console.log('已加载请求记录:', requests.value.length, '条')
    } else {
      console.warn('加载请求记录失败:', response)
    }
  } catch (error) {
    console.error('加载请求记录失败:', error)
  }
}

const loadConfig = async () => {
  try {
    const result = await chrome.storage.local.get(['config'])
    if (result.config) {
      config.value = { ...config.value, ...result.config }
      isMonitoring.value = config.value.isActive
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 广播数据更新到其他界面
const broadcastDataUpdate = () => {
  try {
    // 通过background script广播到所有标签页
    chrome.runtime.sendMessage({
      type: 'BROADCAST_DATA_UPDATE',
      requests: requests.value,
      config: config.value
    })
  } catch (error) {
    console.error('广播数据更新失败:', error)
  }
}

// 请求数据同步
const requestDataSync = () => {
  try {
    chrome.runtime.sendMessage({ type: 'DATA_SYNC_REQUEST' })
  } catch (error) {
    console.error('请求数据同步失败:', error)
  }
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'REQUEST_ADDED') {
    const request = message.payload as NetworkRequest

    // 请求已经在background中进行了验证，直接添加到列表
    requests.value.unshift(request)
    // 限制显示的记录数量
    if (requests.value.length > config.value.maxRecords) {
      requests.value = requests.value.slice(0, config.value.maxRecords)
    }

    // 广播数据更新到其他界面
    broadcastDataUpdate()
  } else if (message.type === 'DATA_SYNC_REQUEST') {
    // 响应其他界面的数据同步请求
    chrome.runtime.sendMessage({
      type: 'DATA_SYNC_RESPONSE',
      requests: requests.value,
      config: config.value
    })
  } else if (message.type === 'DATA_SYNC_RESPONSE') {
    // 接收其他界面的数据同步
    if (message.requests) {
      requests.value = message.requests
    }
    if (message.config) {
      config.value = { ...config.value, ...message.config }
      isMonitoring.value = config.value.isActive
    }

    console.log('📨 收到新请求记录:', {
      url: request.url,
      method: request.method,
      status: request.status,
      hasResponseBody: !!request.responseBody,
      responseBodyLength: request.responseBody ? request.responseBody.length : 0,
      responseBodyPreview: request.responseBody ? request.responseBody.substring(0, 50) : 'N/A'
    })
  } else if (message.type === 'REQUEST_UPDATED') {
    const updatedRequest = message.payload as NetworkRequest

    // 查找并更新现有记录
    const index = requests.value.findIndex(req =>
      req.url === updatedRequest.url &&
      Math.abs(req.timestamp - updatedRequest.timestamp) < 5000
    )

    if (index !== -1) {
      requests.value[index] = updatedRequest
      console.log('🔄 更新请求记录:', {
        url: updatedRequest.url,
        method: updatedRequest.method,
        status: updatedRequest.status,
        hasResponseBody: !!updatedRequest.responseBody,
        responseBodyLength: updatedRequest.responseBody ? updatedRequest.responseBody.length : 0,
        responseBodyPreview: updatedRequest.responseBody ? updatedRequest.responseBody.substring(0, 50) : 'N/A'
      })
    } else {
      // 如果找不到对应记录，作为新记录添加
      requests.value.unshift(updatedRequest)
      console.log('📨 作为新记录添加更新的请求:', updatedRequest.url)
    }
  }
})

// 设置吸顶效果的滚动监听
const setupStickyHeader = () => {
  nextTick(() => {
    const requestsList = document.querySelector('.requests-list')
    const sectionHeader = document.querySelector('.requests-section .section-header')

    if (requestsList && sectionHeader) {
      const handleScroll = () => {
        const scrollTop = requestsList.scrollTop
        if (scrollTop > 10) {
          sectionHeader.classList.add('sticky-active')
        } else {
          sectionHeader.classList.remove('sticky-active')
        }
      }

      requestsList.addEventListener('scroll', handleScroll)
      console.log('✅ [POPUP] 已设置请求记录模块头吸顶效果')
    }
  })
}

// 组件挂载时加载数据
onMounted(async () => {
  await loadConfig()
  await loadRequests()

  // 请求与其他界面同步数据
  setTimeout(() => {
    requestDataSync()
  }, 500)

  // 设置吸顶效果
  setupStickyHeader()

  // 监听来自content script的强制折叠消息
  window.addEventListener('message', (event) => {
    console.log('📨 [POPUP] 收到postMessage:', {
      origin: event.origin,
      data: event.data,
      source: event.source
    })

    if (event.data && event.data.type === 'FORCE_COLLAPSE_MODULES') {
      console.log('📨 [POPUP] 收到强制折叠指令:', event.data)
      headerFullyCollapsed.value = event.data.headerFullyCollapsed === true
      configFullyCollapsed.value = event.data.configFullyCollapsed === true
      console.log('📨 [POPUP] 折叠状态已更新:', {
        headerFullyCollapsed: headerFullyCollapsed.value,
        configFullyCollapsed: configFullyCollapsed.value
      })
    }
  })

  // 也监听parent的消息（如果在iframe中）
  if (window.parent !== window) {
    console.log('📨 [POPUP] 检测到在iframe中运行，添加parent消息监听')
    window.parent.addEventListener('message', (event) => {
      console.log('📨 [POPUP] 收到parent消息:', event.data)
      if (event.data && event.data.type === 'FORCE_COLLAPSE_MODULES') {
        console.log('📨 [POPUP] 从parent收到强制折叠指令:', event.data)
        headerFullyCollapsed.value = event.data.headerFullyCollapsed === true
        configFullyCollapsed.value = event.data.configFullyCollapsed === true
        console.log('📨 [POPUP] 折叠状态已更新（来自parent）:', {
          headerFullyCollapsed: headerFullyCollapsed.value,
          configFullyCollapsed: configFullyCollapsed.value
        })
      }
    })
  }

  // 监听Chrome扩展消息（备用通信方式）
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 [POPUP] 收到Chrome扩展消息:', message)
    if (message.type === 'FORCE_COLLAPSE_MODULES') {
      console.log('📨 [POPUP] 通过Chrome扩展收到强制折叠指令:', message)
      headerFullyCollapsed.value = message.headerFullyCollapsed === true
      configFullyCollapsed.value = message.configFullyCollapsed === true
      console.log('📨 [POPUP] 折叠状态已更新（Chrome扩展）:', {
        headerFullyCollapsed: headerFullyCollapsed.value,
        configFullyCollapsed: configFullyCollapsed.value
      })
      sendResponse({ success: true })
    }
  })
})
</script>

<style lang="scss" scoped>
.network-monitor {
  padding: 16px;  /* 从20px减少到16px */
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%);
  min-height: 800px;  /* 从750px增加到800px，为请求记录提供更多空间 */
  height: 100vh; /* 使用视口高度 */
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;

  .header {
    margin-bottom: 20px;  /* 从24px减少到20px */
    padding: 14px 18px;   /* 从16px 20px减少到14px 18px */
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;  /* 改为center对齐 */
      margin-bottom: 16px;

      .header-left {
        flex: 1;

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;  /* 增加间距 */

          .title {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #1d1d1f;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.02em;

            .el-icon {
              font-size: 20px;
              color: #0ea5e9;
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

      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;  /* 状态指示器和联系我按钮之间的间距 */

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #86868b;
          font-weight: 500;

          &.active {
            color: #10b981;
          }

          .el-icon {
            font-size: 12px;
          }
        }
        .floating-ball-btn {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border: none;
          border-radius: 12px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          }

          &:active {
            transform: translateY(0);
          }

          &.el-button--success {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);

            &:hover {
              box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
            }
          }
        }

        .fullscreen-btn {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: none;
          border-radius: 12px;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
          }

          &:active {
            transform: translateY(0);
          }
        }

        .contact-btn {
          background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
          border: none;
          border-radius: 12px;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
          }

          &:active {
            transform: translateY(0);
          }
        }
      }
    }

    .header-stats {
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      padding-top: 16px;

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);  /* 从4改为5，让5个指标在一行显示 */
        gap: 6px;  /* 稍微减少间距，让5个指标更紧凑 */

        .stat-item {
          text-align: center;
          padding: 8px 4px;  /* 减少左右padding，让5个指标更紧凑 */
          background: rgba(255, 255, 255, 0.6);
          border-radius: 8px;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          &.error {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);

            .stat-value {
              color: #ef4444;
            }
          }

          &.validation-error {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);

            .stat-value {
              color: #f59e0b;
            }
          }

          .stat-value {
            display: block;
            font-size: 15px;  /* 从16px稍微减小到15px */
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 2px;
            letter-spacing: -0.02em;
          }

          .stat-label {
            display: block;
            font-size: 9px;   /* 从10px稍微减小到9px */
            color: #86868b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        }
      }
    }
  }

  .config-section {
    margin-bottom: 20px;  /* 从24px减少到20px */
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;  /* 从16px 20px减少到14px 18px */
      cursor: pointer;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(14, 165, 233, 0.02);
      }

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

      .collapse-btn {
        color: #86868b;
        padding: 4px;

        &:hover {
          color: #0ea5e9;
          background: rgba(14, 165, 233, 0.1);
        }
      }
    }

    .config-content {
      padding: 16px;  /* 从18px进一步减少到16px */
    }

    .config-form {
      .form-section {
        margin-bottom: 16px;  /* 从20px进一步减少到16px */

        &:last-child {
          margin-bottom: 0;
        }

        .section-label {
          font-size: 14px;
          font-weight: 600;
          color: #1d1d1f;
          margin-bottom: 10px;  /* 从12px减少到10px */
          display: flex;
          align-items: center;
          gap: 8px;

          &::before {
            content: '';
            width: 3px;
            height: 16px;
            background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
            border-radius: 2px;
          }

          .help-icon {
            color: #86868b;
            font-size: 14px;
            margin-left: auto;
            cursor: help;
            transition: all 0.2s ease;

            &:hover {
              color: #0ea5e9;
              transform: scale(1.1);
            }
          }

          .section-icon {
            color: #0ea5e9;
            font-size: 16px;
            margin-left: 4px;
          }
        }
      }

      .other-options {
        .option-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;

          &:last-child {
            margin-bottom: 0;
          }

          .option-label {
            font-size: 14px;
            color: #1d1d1f;
            font-weight: 500;
          }

          .max-records-input {
            width: 140px;

            :deep(.el-input__wrapper) {
              background: rgba(255, 255, 255, 0.8);
              border: 1px solid rgba(0, 0, 0, 0.1);
              border-radius: 8px;
              transition: all 0.2s ease;

              &:hover {
                border-color: #0ea5e9;
              }

              &.is-focus {
                border-color: #0ea5e9;
                box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
              }
            }
          }
        }
      }

      .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;

        .primary-action-btn {
          flex: 1;
          min-width: 120px;
          height: 40px;
          background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
          }

          &:active {
            transform: translateY(0);
          }

          &:disabled {
            background: #d1d1d6;
            transform: none;
            box-shadow: none;
          }
        }

        .secondary-action-btn {
          height: 40px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          color: #1d1d1f;
          font-weight: 600;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.9);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          &:active {
            transform: translateY(0);
          }

          &:disabled {
            opacity: 0.5;
            transform: none;
          }
        }
      }
    }

    .valid-icon {
      color: #10b981;
    }

    // 优化复选框样式
    .success-checkbox {
      display: flex;
      align-items: center;

      :deep(.el-checkbox__input) {
        display: flex;
        align-items: center;

        .el-checkbox__inner {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 2px solid #d1d1d6;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;

          &::after {
            width: 6px;
            height: 10px;
            border-width: 2px;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -60%) rotate(45deg);
            position: absolute;
          }
        }

        &.is-checked .el-checkbox__inner {
          background-color: #0ea5e9;
          border-color: #0ea5e9;
          box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
        }

        &:hover .el-checkbox__inner {
          border-color: #0ea5e9;
        }
      }

      :deep(.el-checkbox__label) {
        color: #1d1d1f;
        font-weight: 500;
        font-size: 14px;
        margin-left: 8px;
        line-height: 1;
      }
    }

    .rule-checkbox {
      display: flex;
      align-items: center;

      :deep(.el-checkbox__input) {
        display: flex;
        align-items: center;

        .el-checkbox__inner {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 2px solid #d1d1d6;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;

          &::after {
            width: 5px;
            height: 8px;
            border-width: 2px;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -60%) rotate(45deg);
            position: absolute;
          }
        }

        &.is-checked .el-checkbox__inner {
          background-color: #10b981;
          border-color: #10b981;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }

        &:hover .el-checkbox__inner {
          border-color: #10b981;
        }
      }
    }

    // 域名配置样式
    .domain-config-container {
      .domain-enable-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding: 12px;
        background: rgba(14, 165, 233, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(14, 165, 233, 0.1);

        .domain-enable-checkbox {
          flex-shrink: 0;
        }

        .domain-enable-desc {
          font-size: 13px;
          color: #86868b;
          font-weight: 500;
        }
      }

      .domain-list-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        min-height: 32px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.05);

        .domain-tag {
          background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
          color: white;
          border: none;
          font-weight: 500;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 16px;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
          }

          &.invalid {
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          }

          :deep(.el-tag__close) {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;

            &:hover {
              color: white;
              background: rgba(255, 255, 255, 0.2);
            }
          }
        }

        .domain-input {
          width: 200px;

          :deep(.el-input__inner) {
            border-radius: 16px;
            border: 1px solid #d1d5db;
            font-size: 12px;

            &:focus {
              border-color: #0ea5e9;
              box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1);
            }
          }
        }

        .button-new-domain {
          background: rgba(14, 165, 233, 0.1);
          color: #0ea5e9;
          border: 1px dashed #0ea5e9;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 12px;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(14, 165, 233, 0.15);
            border-color: #0ea5e9;
            transform: translateY(-1px);
          }
        }
      }
    }

    .prefixes-input-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      min-height: 32px;

      .prefix-tag {
        background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
        border: none;
        color: white;
        border-radius: 8px;
        font-weight: 500;
        max-width: 300px;

        &.invalid {
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
        }

        :deep(.el-tag__close) {
          color: rgba(255, 255, 255, 0.8);

          &:hover {
            color: white;
            background: rgba(255, 255, 255, 0.2);
          }
        }
      }

      .prefix-input {
        width: 300px;

        :deep(.el-input__wrapper) {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #0ea5e9;
          border-radius: 8px;
        }
      }

      .button-new-tag {
        background: rgba(14, 165, 233, 0.1);
        border: 1px dashed #0ea5e9;
        color: #0ea5e9;
        border-radius: 8px;
        font-weight: 500;

        &:hover {
          background: rgba(14, 165, 233, 0.2);
        }
      }
    }

    .url-replace-rules {
      .rule-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .rule-input {
          flex: 1;

          :deep(.el-input__wrapper) {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            transition: all 0.2s ease;

            &:hover {
              border-color: #0ea5e9;
            }

            &.is-focus {
              border-color: #0ea5e9;
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
            }
          }
        }

        .arrow {
          color: #0ea5e9;
          font-weight: 700;
          font-size: 16px;
          min-width: 20px;
          text-align: center;
        }
      }

      .rule-select {
        width: 120px;

        :deep(.el-input__wrapper) {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          transition: all 0.2s ease;

          &:hover {
            border-color: #0ea5e9;
          }

          &.is-focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
          }
        }
      }

      // URL替换规则帮助信息样式
      .url-replace-help {
        margin-top: 16px;
        padding: 16px 20px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%);
        border-radius: 12px;
        border-left: 4px solid #10b981;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);

        :deep(.el-text) {
          font-size: 13px;
          line-height: 1.6;
          color: #10b981;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          gap: 8px;

          .el-icon {
            margin-top: 2px;
            flex-shrink: 0;
          }
        }
      }

      // 响应验证规则帮助信息样式
      .validation-help {
        margin-top: 16px;
        padding: 16px 20px;
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%);
        border-radius: 12px;
        border-left: 4px solid #0ea5e9;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);

        :deep(.el-text) {
          font-size: 13px;
          line-height: 1.6;
          color: #0ea5e9;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          gap: 8px;

          .el-icon {
            margin-top: 2px;
            flex-shrink: 0;
          }
        }
      }

      .add-rule-btn {
        background: rgba(14, 165, 233, 0.1);
        border: 2px dashed #0ea5e9;
        color: #0ea5e9;
        border-radius: 12px;
        font-weight: 600;
        width: 100%;
        height: 40px;
        font-size: 14px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(14, 165, 233, 0.2);
          border-color: #10b981;
          color: #10b981;
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    // 响应验证规则样式 - 与URL替换规则保持一致
    .response-validation-rules {
      .rule-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .rule-input {
          flex: 1;

          :deep(.el-input__wrapper) {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            transition: all 0.2s ease;

            &:hover {
              border-color: #0ea5e9;
            }

            &.is-focus {
              border-color: #0ea5e9;
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
            }
          }

          // 响应验证规则三等分样式
          &.rule-input--equal {
            flex: 1;
            min-width: 0;
          }
        }

        .rule-select {
          width: 120px;

          :deep(.el-input__wrapper) {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            transition: all 0.2s ease;

            &:hover {
              border-color: #0ea5e9;
            }

            &.is-focus {
              border-color: #0ea5e9;
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
            }
          }

          // 响应验证规则三等分样式
          &.rule-select--equal {
            flex: 1;
            min-width: 0;
            width: auto;
          }
        }
      }

      .validation-help {
        margin-top: 16px;
        padding: 16px 20px;
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%);
        border-radius: 12px;
        border-left: 4px solid #0ea5e9;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);

        :deep(.el-text) {
          font-size: 13px;
          line-height: 1.6;
          color: #0ea5e9;
          font-weight: 500;
        }
      }

      .add-rule-btn {
        background: rgba(14, 165, 233, 0.1);
        border: 2px dashed #0ea5e9;
        color: #0ea5e9;
        border-radius: 12px;
        font-weight: 600;
        width: 100%;
        height: 40px;
        font-size: 14px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(14, 165, 233, 0.2);
          border-color: #10b981;
          color: #10b981;
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }
  }



  .requests-section {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex: 1; /* 让请求记录模块占用剩余空间 */
    display: flex;
    flex-direction: column;

    .section-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 16px 16px 0 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      /* 吸顶时的增强效果 */
      &.sticky-active {
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(30px);
        box-shadow:
          0 2px 20px rgba(0, 0, 0, 0.08),
          0 1px 3px rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);

        /* 吸顶时的微妙动画效果 */
        transform: translateY(0);

        .header-top {
          border-bottom-color: rgba(0, 0, 0, 0.08);
        }

        .search-filter-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(25px);
        }
      }

      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;  /* 从16px 20px减少到14px 18px */
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #1d1d1f;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            color: #0ea5e9;
          }

          .el-icon {
            font-size: 18px;
            color: #0ea5e9;
            flex-shrink: 0;
          }

          span {
            flex-shrink: 0;
          }

          .collapse-btn {
            color: #86868b;
            padding: 4px;
            margin-left: 8px;

            &:hover {
              color: #0ea5e9;
              background: rgba(14, 165, 233, 0.1);
            }
          }
        }

        .filter-tabs {
          display: flex;
          gap: 6px;  /* 从8px减少到6px */

          .filter-tab {
            padding: 6px 12px;  /* 从8px 20px减少到6px 12px */
            border-radius: 8px;  /* 从12px减少到8px */
            font-weight: 600;
            font-size: 12px;     /* 从13px减少到12px */
            border: 1px solid transparent;  /* 从2px减少到1px */
            transition: all 0.2s ease;  /* 从0.3s减少到0.2s */
            position: relative;
            overflow: hidden;
            min-width: 60px;     /* 从80px减少到60px */
            text-align: center;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            &:active {
              transform: translateY(-1px);
            }

            // 问题接口 - 紫色主题
            &.filter-tab--problem {
              background: rgba(147, 51, 234, 0.1);
              color: #9333ea;
              border-color: rgba(147, 51, 234, 0.2);

              &:hover {
                background: rgba(147, 51, 234, 0.15);
                border-color: rgba(147, 51, 234, 0.3);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(147, 51, 234, 0.15);
              }

              &.active {
                background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
                color: white;
                border-color: #9333ea;
                box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
                transform: translateY(-1px);

                &::after {
                  content: '';
                  position: absolute;
                  top: -2px;
                  left: -2px;
                  right: -2px;
                  bottom: -2px;
                  background: linear-gradient(135deg, #9333ea, #7c3aed);
                  border-radius: inherit;
                  z-index: -1;
                  opacity: 0.3;
                  pointer-events: none;
                }
              }
            }

            // 全部 - 蓝色主题
            &.filter-tab--all {
              background: rgba(14, 165, 233, 0.1);
              color: #0ea5e9;
              border-color: rgba(14, 165, 233, 0.2);

              &:hover {
                background: rgba(14, 165, 233, 0.15);
                border-color: rgba(14, 165, 233, 0.3);
              }

              &.active {
                background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
                color: white;
                border-color: #0ea5e9;
                box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);

                &::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
                  pointer-events: none;
                }
              }
            }

            // 错误 - 红色主题
            &.filter-tab--error {
              background: rgba(239, 68, 68, 0.1);
              color: #ef4444;
              border-color: rgba(239, 68, 68, 0.2);

              &:hover {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.3);
              }

              &.active {
                background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
                color: white;
                border-color: #ef4444;
                box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);

                &::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
                  pointer-events: none;
                }
              }
            }

            // 验证异常 - 橙色主题
            &.filter-tab--validation {
              background: rgba(245, 158, 11, 0.1);
              color: #f59e0b;
              border-color: rgba(245, 158, 11, 0.2);

              &:hover {
                background: rgba(245, 158, 11, 0.15);
                border-color: rgba(245, 158, 11, 0.3);
              }

              &.active {
                background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
                color: white;
                border-color: #f59e0b;
                box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);

                &::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
                  pointer-events: none;
                }
              }
            }
          }
        }
      }
    }

    .requests-content {
      padding: 0 18px 18px;  /* 从0 20px 20px减少到0 18px 18px */
      flex: 1; /* 让内容区域占用剩余空间 */
      display: flex;
      flex-direction: column;
    }

    .requests-list {
      flex: 1; /* 让请求列表占用剩余空间 */
      min-height: 400px; /* 设置最小高度 */
      max-height: 800px; /* 增加最大高度，占满底部 */
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.05);

      .request-item {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(14, 165, 233, 0.05);
          transform: translateX(2px);
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

        .request-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          cursor: pointer;

          .method {
            font-size: 10px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 8px;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            min-width: 45px;
            text-align: center;

            &.get {
              background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
              box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
            }
            &.post {
              background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
              box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
            }
            &.put {
              background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
              box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
            }
            &.delete {
              background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
              box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
            }
            &.patch {
              background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
              box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
            }
            &.head, &.options {
              background: linear-gradient(135deg, #8e8e93 0%, #aeaeb2 100%);
              box-shadow: 0 2px 4px rgba(142, 142, 147, 0.3);
            }
          }

          .status {
            font-size: 12px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 6px;
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;

            &.error {
              background: rgba(239, 68, 68, 0.1);
              color: #ef4444;
            }

            .validation-tag {
              margin-left: 4px;
              font-size: 8px;
              padding: 1px 4px;
              height: 16px;
              line-height: 14px;
            }
          }

          .url {
            flex: 1;
            font-size: 13px;
            color: #1d1d1f;
            font-weight: 500;
            line-height: 1.4;
            word-break: break-all;  /* 允许在任意字符处换行 */
            max-height: 2.8em;      /* 限制最大高度为2行 */
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;  /* 最多显示2行 */
            -webkit-box-orient: vertical;
          }

          .time {
            font-size: 11px;
            color: #86868b;
            font-weight: 600;
            padding: 2px 6px;
            background: rgba(134, 134, 139, 0.1);
            border-radius: 4px;
          }
        }

        .request-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .timestamp {
            font-size: 11px;
            color: #86868b;
            font-weight: 500;
          }

          .request-actions {
            opacity: 0;
            transition: all 0.3s ease;
            transform: translateX(10px);
            display: flex;
            gap: 8px;

            .send-btn {
              font-size: 10px;
              padding: 4px 12px;
              height: 24px;
              border-radius: 12px;
              background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
              border: none;
              color: white;
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

              &.is-loading {
                opacity: 0.7;
              }
            }

            .curl-btn {
              font-size: 10px;
              padding: 4px 12px;
              height: 24px;
              border-radius: 12px;
              background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
              border: none;
              color: white;
              font-weight: 600;
              box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
              transition: all 0.2s ease;

              &:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
              }

              &:active {
                transform: translateY(0);
              }
            }
          }
        }

        &:hover .request-meta .request-actions {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.05);

      .el-icon {
        font-size: 64px;
        margin-bottom: 20px;
        color: #d1d1d6;
      }

      p {
        margin: 12px 0;
        color: #86868b;
        font-weight: 500;

        &:first-of-type {
          font-size: 16px;
          color: #1d1d1f;
          font-weight: 600;
        }

        &.hint {
          font-size: 13px;
          color: #86868b;
        }
      }
    }
  }

  // Tooltip样式
  .tooltip-content {
    max-width: 320px;
    padding: 4px 0;

    .tooltip-title {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .tooltip-desc {
      font-size: 13px;
      color: #e5e5e7;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .tooltip-examples {
      margin-bottom: 12px;

      .example-title {
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 6px;
      }

      .example-item {
        font-size: 12px;
        color: #d1d1d6;
        line-height: 1.4;
        margin-bottom: 4px;
        padding-left: 8px;

        strong {
          color: #ffffff;
        }
      }
    }

    .tooltip-tips {
      .tips-title {
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 6px;
      }

      .tips-item {
        font-size: 12px;
        color: #d1d1d6;
        line-height: 1.4;
        margin-bottom: 3px;
        padding-left: 8px;

        strong {
          color: #ffffff;
        }
      }

      .tips-example {
        font-size: 12px;
        color: #ffd60a;
        line-height: 1.4;
        margin-top: 8px;
        padding: 6px 8px;
        background: rgba(255, 214, 10, 0.1);
        border-radius: 4px;
        border-left: 2px solid #ffd60a;

        strong {
          color: #ffd60a;
        }
      }
    }
  }
}

// 滚动条样式 - Apple风格
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 139, 0.3);
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(134, 134, 139, 0.5);
  }

  &:active {
    background: rgba(134, 134, 139, 0.7);
  }
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* 顶部操作按钮样式 */
.top-actions-section {
  margin-top: 16px;
  padding: 12px;        /* 从16px减少到12px */
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);

  .action-buttons-row {
    display: flex;
    gap: 8px;
    align-items: center;

    .primary-action-btn {
      flex: 1.5;  /* 主按钮稍微大一些 */
      height: 32px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      transition: all 0.2s ease;
      background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
      border: none;
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
      }

      &.el-button--danger {
        background: linear-gradient(135deg, #ff3b30 0%, #ff6b6b 100%);

        &:hover {
          box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
        }
      }
    }

    .secondary-action-btn {
      flex: 1;
      height: 32px;
      font-size: 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #1d1d1f;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;

        &:hover {
          transform: none;
          box-shadow: none;
        }
      }
    }
  }
}

/* 导入配置对话框样式优化 */
.import-config-dialog {
  :deep(.el-dialog) {
    margin-top: 5vh !important;
    margin-bottom: 5vh !important;
    max-height: 85vh;
    min-height: 450px;
    display: flex;
    flex-direction: column;
    margin: auto;
  }

  :deep(.el-dialog__body) {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    min-height: 300px;
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

/* 快速复制配置样式 */
.quick-copy-config {
  .config-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .config-item {
      flex: 1;

      &.full-width {
        flex: none;
        width: 100%;
      }

      .config-label {
        display: block;
        font-size: 12px;
        color: #86868b;
        margin-bottom: 6px;
        font-weight: 500;
      }

      .config-input {
        width: 100%;
      }

      .config-desc {
        font-size: 11px;
        color: #86868b;
        margin-top: 6px;
        line-height: 1.4;
      }
    }
  }
}

/* 快速复制按钮样式 */
.quick-copy-btn {
  font-size: 11px;
  padding: 4px 8px;
  height: 24px;
  border-radius: 4px;

  &.el-button--success {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    border-color: #10b981;

    &:hover {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-color: #059669;
    }
  }

  &.el-button--primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border-color: #2563eb;

    &:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border-color: #1d4ed8;
    }
  }

  &.el-button--warning {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border-color: #f59e0b;

    &:hover {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-color: #d97706;
    }
  }
}

/* 导入配置对话框样式 */
.import-config-content {
  .import-tabs {
    .el-tabs__header {
      margin-bottom: 20px;
    }
  }

  .import-section {
    padding: 10px 0;

    .import-input {
      margin-bottom: 15px;
    }

    .import-tips {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #86868b;
      background: rgba(0, 122, 255, 0.1);
      padding: 8px 12px;
      border-radius: 6px;

      .el-icon {
        color: #007aff;
      }
    }

    .json-textarea {
      margin-bottom: 15px;

      :deep(.el-textarea__inner) {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.4;
      }
    }

    .config-upload {
      :deep(.el-upload) {
        width: 100%;
      }

      :deep(.el-upload-dragger) {
        width: 100%;
        height: 120px;
        border: 2px dashed #d1d1d6;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.6);
        transition: all 0.2s ease;

        &:hover {
          border-color: #007aff;
          background: rgba(0, 122, 255, 0.05);
        }
      }

      :deep(.el-icon--upload) {
        font-size: 32px;
        color: #86868b;
        margin-bottom: 8px;
      }

      :deep(.el-upload__text) {
        color: #1d1d1f;
        font-size: 14px;

        em {
          color: #007aff;
          font-style: normal;
          font-weight: 600;
        }
      }

      :deep(.el-upload__tip) {
        margin-top: 8px;
        font-size: 12px;
        color: #86868b;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 搜索过滤区域样式 */
.search-filter-section {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  /* 作为吸顶头部的一部分，继承父级的sticky定位 */

  .search-input-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .search-input {
      flex: 1;

      :deep(.el-input__wrapper) {
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        background: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;

        &:hover {
          border-color: rgba(0, 122, 255, 0.3);
        }

        &.is-focus {
          border-color: #007aff;
          box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
        }
      }

      :deep(.el-input__inner) {
        font-size: 13px;
        color: #1d1d1f;

        &::placeholder {
          color: #86868b;
        }
      }

      :deep(.el-input__prefix) {
        color: #86868b;
      }
    }

    .clear-search-btn {
      font-size: 12px;
      color: #86868b;
      padding: 4px 8px;

      &:hover {
        color: #007aff;
      }
    }
  }

  .quick-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .quick-filter-label {
      font-size: 12px;
      color: #86868b;
      font-weight: 500;
      margin-right: 4px;
    }

    .quick-filter-btn {
      font-size: 11px;
      padding: 4px 8px;
      height: 24px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: rgba(255, 255, 255, 0.8);
      color: #1d1d1f;
      transition: all 0.2s ease;

      &:hover {
        border-color: #007aff;
        background: rgba(0, 122, 255, 0.1);
        color: #007aff;
      }

      &.active {
        border-color: #007aff;
        background: #007aff;
        color: white;

        &:hover {
          background: #0056cc;
          border-color: #0056cc;
        }
      }
    }
  }
}

/* 搜索结果信息样式 */
.search-results-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 122, 255, 0.1);
  border-bottom: 1px solid rgba(0, 122, 255, 0.2);
  font-size: 12px;
  color: #007aff;

  .el-icon {
    font-size: 14px;
  }

  .el-button {
    font-size: 11px;
    padding: 2px 6px;
    height: 20px;
    margin-left: auto;
  }
}

/* 完全折叠状态样式：更小的点，确保两个模块高度一致 */
.header-dot,
.config-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin: 4px 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  .dot-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 6px;
    box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);
    transition: all 0.3s ease;
  }

  &:hover .dot-indicator {
    width: 14px;
    height: 14px;
    font-size: 8px;
    box-shadow: 0 2px 6px rgba(0, 122, 255, 0.4);
    transform: scale(1.2);
  }
}

.header.fully-collapsed,
.config-section.fully-collapsed {
  height: 28px; /* 确保两个模块完全折叠时高度一致 */
  min-height: 28px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

/* 折叠按钮组样式 */
.collapse-buttons {
  display: flex;
  align-items: center;
  gap: 4px;

  .collapse-btn,
  .fully-collapse-btn {
    padding: 4px;
    min-width: 24px;
    height: 24px;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(0, 122, 255, 0.1);
      color: #007aff;
    }
  }

  .fully-collapse-btn {
    &:hover {
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
    }
  }
}
</style>
