/**
 * 修复版本的注入脚本 - 确保响应体能够正确获取
 */

// 初始日志 - 始终显示，用于调试
console.log('🚀 [INJECT-FIXED] 开始加载修复版本的注入脚本...');

// 防止重复注入
if (window.NETWORK_MONITOR_FIXED_INJECTED) {
  console.log('⚠️ [INJECT-FIXED] 已注入，跳过重复注入');
} else {
  window.NETWORK_MONITOR_FIXED_INJECTED = true;

  // 全局配置
  let config = {
    enabled: false,
    apiPrefixes: [],
    enableConsoleLog: false,  // 控制台输出控制
    domainConfig: {
      enabled: false,
      domains: []
    }
  };

  // 控制台日志函数 - 可控制的日志输出
  function log(...args) {
    if (config.enableConsoleLog) {
      console.log(...args);
    }
  }

  function warn(...args) {
    if (config.enableConsoleLog) {
      console.warn(...args);
    }
  }

  function error(...args) {
    if (config.enableConsoleLog) {
      console.error(...args);
    }
  }

  // 工具函数
  function matchesDomainConfig(currentDomain, configuredDomains) {
    if (!currentDomain || !configuredDomains || configuredDomains.length === 0) {
      return false;
    }

    // 清理当前域名，移除协议和端口
    const cleanCurrentDomain = currentDomain.replace(/^https?:\/\//, '').split(':')[0];

    return configuredDomains.some(configDomain => {
      // 清理配置的域名
      const cleanConfigDomain = configDomain.replace(/^https?:\/\//, '').split(':')[0];

      // 支持通配符匹配
      if (cleanConfigDomain.startsWith('*.')) {
        const wildcardDomain = cleanConfigDomain.substring(2);
        return cleanCurrentDomain.endsWith(wildcardDomain);
      }

      // 精确匹配
      return cleanCurrentDomain === cleanConfigDomain;
    });
  }

  function shouldInjectOnCurrentDomain() {
    // 如果未启用域名限制，默认不生效（更安全的做法）
    if (!config.domainConfig.enabled) {
      log('🔍 域名限制未启用，检查API前缀是否包含当前域名');
      // 如果域名限制未启用，但API前缀中包含通配符匹配当前域名，则允许注入
      return checkApiPrefixesMatchCurrentDomain();
    }

    try {
      const currentDomain = window.location.hostname;
      const matches = matchesDomainConfig(currentDomain, config.domainConfig.domains);
      log(`🔍 域名匹配检查: ${currentDomain} = ${matches}`);
      return matches;
    } catch {
      return false;
    }
  }

  // 检查API前缀是否匹配当前域名
  function checkApiPrefixesMatchCurrentDomain() {
    if (!config.apiPrefixes || config.apiPrefixes.length === 0) {
      return false;
    }

    try {
      const currentDomain = window.location.hostname;
      log(`🔍 检查API前缀是否匹配当前域名: ${currentDomain}`);

      return config.apiPrefixes.some(prefix => {
        if (prefix.includes('*')) {
          // 从API前缀中提取域名部分进行匹配
          let domainPattern = prefix;

          // 移除协议
          if (domainPattern.startsWith('http://') || domainPattern.startsWith('https://')) {
            domainPattern = domainPattern.replace(/^https?:\/\//, '');
          }

          // 提取域名部分（移除路径）
          domainPattern = domainPattern.split('/')[0];

          if (domainPattern.startsWith('*.')) {
            const baseDomain = domainPattern.substring(2);
            const matches = currentDomain === baseDomain || currentDomain.endsWith('.' + baseDomain);
            log(`🔍 API前缀域名匹配: ${currentDomain} vs ${baseDomain} = ${matches}`);
            return matches;
          }
        }
        return false;
      });
    } catch (error) {
      error('🔍 API前缀域名匹配检查失败:', error);
      return false;
    }
  }

  function shouldMonitor(url) {
    if (!config.enabled || !config.apiPrefixes.length) {
      return false;
    }

    // 检查域名限制
    if (!shouldInjectOnCurrentDomain()) {
      return false;
    }

    return config.apiPrefixes.some(prefix => matchesApiPrefix(url, prefix));
  }

  // API前缀匹配函数（支持通配符）
  function matchesApiPrefix(url, apiPrefix) {
    if (!apiPrefix || !url) return false;

    // 如果是通配符格式
    if (apiPrefix.includes('*')) {
      return matchesWildcardApiPrefix(url, apiPrefix);
    }

    // 传统的前缀匹配
    return url.startsWith(apiPrefix);
  }

  // 通配符API前缀匹配
  function matchesWildcardApiPrefix(url, wildcardPrefix) {
    try {
      // 解析URL
      const urlObj = new URL(url);

      // 处理通配符前缀
      let prefixPattern = wildcardPrefix;
      let protocolRequired = '';

      // 检查是否指定了协议
      if (prefixPattern.startsWith('http://') || prefixPattern.startsWith('https://')) {
        const protocolMatch = prefixPattern.match(/^(https?:\/\/)/);
        if (protocolMatch) {
          protocolRequired = protocolMatch[1];
          prefixPattern = prefixPattern.substring(protocolMatch[1].length);
        }
      }

      // 如果指定了协议，检查协议是否匹配
      if (protocolRequired && !url.startsWith(protocolRequired)) {
        return false;
      }

      // 分离域名和路径部分
      const parts = prefixPattern.split('/');
      const domainPattern = parts[0];
      const pathPattern = parts.length > 1 ? '/' + parts.slice(1).join('/') : '';

      // 处理域名通配符匹配
      if (domainPattern.startsWith('*.')) {
        const baseDomain = domainPattern.substring(2); // 移除 *.

        // 检查域名是否匹配
        const urlDomain = urlObj.hostname;
        const domainMatches = urlDomain === baseDomain || urlDomain.endsWith('.' + baseDomain);

        if (!domainMatches) {
          return false;
        }

        // 如果有路径要求，检查路径是否匹配
        if (pathPattern) {
          const urlPath = urlObj.pathname + urlObj.search;
          return urlPath.startsWith(pathPattern);
        }

        return true;
      }

      return false;
    } catch (error) {
      error('通配符API前缀匹配失败:', error);
      return false;
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function sendToContentScript(data) {
    try {
      // 详细记录发送的数据
      log('📤 [INJECT-FIXED] 准备发送数据到content script:', {
        url: data.url,
        method: data.method,
        status: data.status,
        hasResponseBody: !!data.responseBody,
        responseBodyLength: data.responseBody ? data.responseBody.length : 0,
        responseBodyPreview: data.responseBody ? data.responseBody.substring(0, 100) : 'N/A',
        responseBodyType: typeof data.responseBody
      });

      // 确保响应体数据完整
      if (data.responseBody && data.responseBody.length > 0 && !data.responseBody.startsWith('[')) {
        log('✅ [INJECT-FIXED] 响应体数据有效，长度:', data.responseBody.length);
      } else {
        warn('⚠️ [INJECT-FIXED] 响应体数据可能无效:', data.responseBody ? data.responseBody.substring(0, 50) : 'null/undefined');
      }

      window.postMessage({
        type: 'NETWORK_REQUEST_INTERCEPTED',
        source: 'network-monitor-fixed',
        data: data
      }, '*');

      log('✅ [INJECT-FIXED] 数据发送成功:', data.url);
    } catch (error) {
      error('❌ [INJECT-FIXED] 发送数据失败:', error);
    }
  }

  // 保存原始方法
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // 标记是否已经重写了全局方法
  let globalMethodsOverridden = false;

  // 检查是否应该重写全局方法
  function shouldOverrideGlobalMethods() {
    // 必须同时满足：启用监听、启用域名限制、当前域名匹配
    return config.enabled && shouldInjectOnCurrentDomain() && config.apiPrefixes.length > 0;
  }

  // 重写全局方法
  function overrideGlobalMethods() {
    if (globalMethodsOverridden) {
      return; // 已经重写过了
    }

    if (!shouldOverrideGlobalMethods()) {
      log('⏭️ [INJECT-FIXED] 不满足重写条件，跳过全局方法重写');
      return;
    }

    log('🔧 [INJECT-FIXED] 开始重写全局网络方法');
    globalMethodsOverridden = true;

    // 重写fetch方法
    overrideFetch();
    // 重写XMLHttpRequest方法
    overrideXMLHttpRequest();
  }

  // 恢复全局方法
  function restoreGlobalMethods() {
    if (!globalMethodsOverridden) {
      return;
    }

    log('🔄 [INJECT-FIXED] 恢复原始全局方法');
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    globalMethodsOverridden = false;
  }

  // 重写fetch方法
  function overrideFetch() {
    window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init && init.method) || 'GET';
    const startTime = Date.now();
    const requestId = generateId();

    // 首先检查是否应该在当前域名生效
    if (!shouldInjectOnCurrentDomain()) {
      return originalFetch.apply(this, arguments);
    }

    log('🌐 [FETCH-FIXED] 拦截请求:', method, url);

    if (!shouldMonitor(url)) {
      log('⏭️ [FETCH-FIXED] 跳过监听:', url);
      return originalFetch.apply(this, arguments);
    }

    log('✅ [FETCH-FIXED] 开始监听:', url);

    try {
      // 获取请求信息
      let requestBody = '';
      let requestHeaders = {};

      if (init) {
        if (init.body) {
          try {
            requestBody = typeof init.body === 'string' ? init.body : String(init.body);
          } catch (e) {
            requestBody = '[Body处理失败]';
          }
        }
        if (init.headers) {
          try {
            if (init.headers instanceof Headers) {
              init.headers.forEach((value, key) => {
                requestHeaders[key] = value;
              });
            } else if (typeof init.headers === 'object') {
              requestHeaders = { ...init.headers };
            }
          } catch (e) {
            warn('⚠️ [FETCH-FIXED] 处理请求头失败:', e);
          }
        }
      }

      // 发起原始请求
      const response = await originalFetch.apply(this, arguments);
      const endTime = Date.now();

      log('📡 [FETCH-FIXED] 收到响应:', response.status, response.statusText);

      // 获取响应头
      const responseHeaders = {};
      try {
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
      } catch (e) {
        warn('⚠️ [FETCH-FIXED] 获取响应头失败:', e);
      }

      // 读取响应体 - 改进的响应体获取逻辑
      let responseBody = '';
      try {
        // 总是尝试克隆响应来读取响应体
        const responseClone = response.clone();

        // 方法1：尝试直接读取为文本
        try {
          responseBody = await responseClone.text();
          log('📥 [FETCH-FIXED] 方法1成功：text()读取，长度:', responseBody.length);
        } catch (textError) {
          log('⚠️ [FETCH-FIXED] 方法1失败，尝试方法2:', textError.message);

          // 方法2：尝试读取为ArrayBuffer然后转换
          try {
            const responseClone2 = response.clone();
            const arrayBuffer = await responseClone2.arrayBuffer();
            responseBody = new TextDecoder('utf-8').decode(arrayBuffer);
            log('📥 [FETCH-FIXED] 方法2成功：ArrayBuffer读取，长度:', responseBody.length);
          } catch (bufferError) {
            log('⚠️ [FETCH-FIXED] 方法2失败，尝试方法3:', bufferError.message);

            // 方法3：尝试读取为Blob然后转换
            try {
              const responseClone3 = response.clone();
              const blob = await responseClone3.blob();
              responseBody = await blob.text();
              log('📥 [FETCH-FIXED] 方法3成功：Blob读取，长度:', responseBody.length);
            } catch (blobError) {
              log('❌ [FETCH-FIXED] 所有方法都失败:', blobError.message);
              responseBody = '[响应体读取失败: 所有方法都失败]';
            }
          }
        }

        // 输出响应体内容（总是输出，便于调试）
        if (responseBody && responseBody.length > 0 && !responseBody.startsWith('[')) {
          log('📄 [FETCH-FIXED] 响应体内容预览:', responseBody.substring(0, 200) + (responseBody.length > 200 ? '...' : ''));
          log('📊 [FETCH-FIXED] 响应体总长度:', responseBody.length, '字符');
        } else {
          warn('⚠️ [FETCH-FIXED] 响应体为空或读取失败:', responseBody);
        }
      } catch (error) {
        error('❌ [FETCH-FIXED] 响应体处理完全失败:', error);
        responseBody = '[响应体处理失败: ' + error.message + ']';
      }

      // 构建请求记录
      const networkRequest = {
        id: requestId,
        url: url,
        method: method.toUpperCase(),
        status: response.status,
        statusText: response.statusText,
        requestHeaders: requestHeaders,
        responseHeaders: responseHeaders,
        requestBody: requestBody,
        responseBody: responseBody,
        timestamp: startTime,
        duration: endTime - startTime,
        domain: new URL(url).hostname,
        isError: response.status >= 400
      };

      // 发送到content script
      sendToContentScript(networkRequest);

      return response;
    } catch (error) {
      console.error('❌ [FETCH-FIXED] 请求处理失败:', error);
      throw error;
    }
    };
  }

  // 重写XMLHttpRequest方法
  function overrideXMLHttpRequest() {
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
    // 首先检查是否应该在当前域名生效
    if (!shouldInjectOnCurrentDomain()) {
      return originalXHROpen.apply(this, arguments);
    }

    log('🌐 [XHR-FIXED] 拦截请求:', method, url);

    this._requestInfo = {
      method: method.toUpperCase(),
      url: url,
      startTime: Date.now(),
      requestId: generateId(),
      headers: {},
      body: ''
    };

    this._shouldMonitor = shouldMonitor(url);

    if (this._shouldMonitor) {
      log('✅ [XHR-FIXED] 开始监听:', url);
    } else {
      log('⏭️ [XHR-FIXED] 跳过监听:', url);
    }

    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(data) {
    // 首先检查是否应该在当前域名生效
    if (!shouldInjectOnCurrentDomain()) {
      return originalXHRSend.apply(this, arguments);
    }

    if (this._requestInfo && data) {
      try {
        this._requestInfo.body = typeof data === 'string' ? data : String(data);
      } catch (e) {
        this._requestInfo.body = '[Body处理失败]';
      }
    }

    if (this._shouldMonitor && this._requestInfo) {
      log('📤 [XHR-FIXED] 发送请求:', this._requestInfo.method, this._requestInfo.url);

      // 监听响应 - 关键修复点
      const originalOnReadyStateChange = this.onreadystatechange;

      this.onreadystatechange = function() {
        if (this.readyState === 4) { // 请求完成
          const endTime = Date.now();
          log('📡 [XHR-FIXED] 收到响应:', this.status, this.statusText);

          // 获取响应头
          const responseHeaders = {};
          try {
            const headerString = this.getAllResponseHeaders();
            if (headerString) {
              headerString.split('\r\n').forEach(line => {
                const parts = line.split(': ');
                if (parts.length === 2) {
                  responseHeaders[parts[0].toLowerCase()] = parts[1];
                }
              });
            }
          } catch (e) {
            warn('⚠️ [XHR-FIXED] 获取响应头失败:', e);
          }

          // 获取响应体 - 改进的响应体获取逻辑
          let responseBody = '';
          try {
            // 方法1：尝试使用responseText
            if (this.responseText !== undefined && this.responseText !== null && this.responseText !== '') {
              responseBody = this.responseText;
              log('📥 [XHR-FIXED] 方法1成功：responseText读取，长度:', responseBody.length);
            }
            // 方法2：尝试使用response属性
            else if (this.response !== undefined && this.response !== null) {
              if (typeof this.response === 'string') {
                responseBody = this.response;
                log('📥 [XHR-FIXED] 方法2成功：response(string)读取，长度:', responseBody.length);
              } else if (this.response instanceof ArrayBuffer) {
                responseBody = new TextDecoder('utf-8').decode(this.response);
                log('📥 [XHR-FIXED] 方法2成功：response(ArrayBuffer)读取，长度:', responseBody.length);
              } else {
                responseBody = String(this.response);
                log('📥 [XHR-FIXED] 方法2成功：response(转换)读取，长度:', responseBody.length);
              }
            }
            // 方法3：检查是否是特殊的响应类型
            else {
              log('⚠️ [XHR-FIXED] 标准方法无效，检查响应状态');
              log('📊 [XHR-FIXED] 响应状态:', {
                readyState: this.readyState,
                status: this.status,
                responseType: this.responseType,
                responseTextLength: this.responseText ? this.responseText.length : 'null/undefined',
                responseType_: typeof this.response,
                responseValue: this.response
              });
              responseBody = '[无法获取响应体]';
            }

            // 输出响应体内容（总是输出，便于调试）
            if (responseBody && responseBody.length > 0 && !responseBody.startsWith('[')) {
              log('📄 [XHR-FIXED] 响应体内容预览:', responseBody.substring(0, 200) + (responseBody.length > 200 ? '...' : ''));
              log('📊 [XHR-FIXED] 响应体总长度:', responseBody.length, '字符');
            } else {
              warn('⚠️ [XHR-FIXED] 响应体为空或读取失败:', responseBody);
            }
          } catch (error) {
            error('❌ [XHR-FIXED] 响应体读取失败:', error);
            responseBody = '[响应体读取失败: ' + error.message + ']';
          }

          // 构建网络请求记录
          const networkRequest = {
            id: this._requestInfo.requestId,
            url: this._requestInfo.url,
            method: this._requestInfo.method,
            status: this.status,
            statusText: this.statusText,
            requestHeaders: this._requestInfo.headers,
            responseHeaders: responseHeaders,
            requestBody: this._requestInfo.body,
            responseBody: responseBody,
            timestamp: this._requestInfo.startTime,
            duration: endTime - this._requestInfo.startTime,
            domain: new URL(this._requestInfo.url).hostname,
            isError: this.status >= 400
          };

          // 发送到content script
          sendToContentScript(networkRequest);
        }

        // 调用原始的onreadystatechange
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };
    }

    return originalXHRSend.apply(this, arguments);
    };
  }

  // 监听配置更新
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    const { type, source, data } = event.data;
    if (type === 'NETWORK_MONITOR_CONFIG' && source === 'network-monitor-content-script') {
      log('📨 [INJECT-FIXED] 收到配置更新:', data);

      config = {
        enabled: data.enabled || false,
        apiPrefixes: data.apiPrefixes || [],
        enableConsoleLog: data.enableConsoleLog || false,
        domainConfig: data.domainConfig || {
          enabled: true,  // 默认启用域名限制
          domains: []
        }
      };

      log('🔄 [INJECT-FIXED] 配置已更新:', config);

      // 根据新配置决定是否重写全局方法
      log('🔍 [INJECT-FIXED] 检查是否应该重写全局方法:', {
        enabled: config.enabled,
        domainConfigEnabled: config.domainConfig.enabled,
        currentDomain: window.location.hostname,
        configuredDomains: config.domainConfig.domains,
        apiPrefixesCount: config.apiPrefixes.length,
        shouldInject: shouldInjectOnCurrentDomain(),
        shouldOverride: shouldOverrideGlobalMethods()
      });

      if (shouldOverrideGlobalMethods()) {
        log('✅ [INJECT-FIXED] 条件满足，开始重写全局方法');
        overrideGlobalMethods();
      } else {
        log('⏭️ [INJECT-FIXED] 条件不满足，恢复或保持原始方法');
        restoreGlobalMethods();
      }
    }
  });

  log('🎉 [INJECT-FIXED] 修复版本注入完成，等待配置更新后决定是否重写全局方法');
}
