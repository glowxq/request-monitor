/**
 * 页面注入脚本 - 简洁版本
 * 参考掘金文章的实现方式
 */

// 防止重复注入
if (window.NETWORK_MONITOR_INJECTED) {
  console.log('⚠️ 网络监听器已注入，跳过重复注入');
} else {
  window.NETWORK_MONITOR_INJECTED = true;
  console.log('🚀 [INJECT] 网络监听器注入脚本开始加载...');

  // 全局配置
  let monitorConfig = {
    enabled: false,
    apiPrefixes: [],
    validationRules: []
  };

  // 工具函数
  function shouldMonitorUrl(url) {
    if (!monitorConfig.enabled || !monitorConfig.apiPrefixes.length) {
      return false;
    }
    return monitorConfig.apiPrefixes.some(prefix => matchesApiPrefix(url, prefix));
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
      console.warn('通配符API前缀匹配失败:', error);
      return false;
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  function isErrorStatus(status) {
    return status >= 400;
  }

  function sendToContentScript(requestData) {
    try {
      window.postMessage({
        type: 'NETWORK_REQUEST_INTERCEPTED',
        source: 'network-monitor-inject',
        data: requestData
      }, '*');
      console.log('📤 [INJECT] 发送请求数据:', requestData.url);
    } catch (error) {
      console.error('❌ [INJECT] 发送数据失败:', error);
    }
  }

  // 拦截Fetch请求
  const interceptFetch = () => {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      const method = (config && config.method) || 'GET';
      const startTime = Date.now();
      const requestId = generateId();

      console.log('🌐 [FETCH] 拦截请求:', method, url);

      // 检查是否需要监听
      if (!shouldMonitorUrl(url)) {
        console.log('⏭️ [FETCH] 跳过监听:', url);
        return originalFetch.apply(this, args);
      }

      console.log('✅ [FETCH] 开始监听:', url);

      try {
        // 获取请求信息
        let requestBody = '';
        let requestHeaders = {};
        
        if (config) {
          if (config.body) {
            try {
              if (typeof config.body === 'string') {
                requestBody = config.body;
              } else if (config.body instanceof FormData) {
                requestBody = '[FormData]';
              } else {
                requestBody = String(config.body);
              }
            } catch (error) {
              requestBody = '[处理失败]';
            }
          }
          
          if (config.headers) {
            if (config.headers instanceof Headers) {
              config.headers.forEach((value, key) => {
                requestHeaders[key] = value;
              });
            } else if (typeof config.headers === 'object') {
              requestHeaders = { ...config.headers };
            }
          }
        }

        // 发起请求
        const response = await originalFetch.apply(this, args);
        const endTime = Date.now();

        console.log('📡 [FETCH] 收到响应:', response.status, response.statusText, url);

        // 获取响应头
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // 读取响应体 - 关键部分
        let responseBody = '';
        try {
          const clonedResponse = response.clone();
          responseBody = await clonedResponse.text();
          
          console.log('📥 [FETCH] 成功读取响应体 (长度:', responseBody.length, ')');
          console.log('📄 [FETCH] 响应体内容:', responseBody.substring(0, 500));
          
          if (responseBody.length > 500) {
            console.log('📄 [FETCH] 响应体总长度:', responseBody.length, '字符');
          }
        } catch (error) {
          console.error('❌ [FETCH] 读取响应体失败:', error);
          responseBody = '[Failed to read response body]';
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
          domain: extractDomain(url),
          isError: isErrorStatus(response.status)
        };

        // 发送到content script
        sendToContentScript(networkRequest);

        return response;
      } catch (error) {
        console.error('❌ [FETCH] 请求失败:', error);
        throw error;
      }
    };
  };

  // 拦截XMLHttpRequest
  const interceptXHR = () => {
    const xhr = XMLHttpRequest.prototype;
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    const originalSetRequestHeader = xhr.setRequestHeader;

    xhr.open = function(method, url, async, user, pass) {
      console.log('🌐 [XHR] 拦截请求:', method, url);
      
      // 存储请求信息
      this._requestInfo = {
        method: method.toUpperCase(),
        url: url,
        startTime: Date.now(),
        requestId: generateId(),
        headers: {},
        body: ''
      };
      
      this._shouldMonitor = shouldMonitorUrl(url);
      
      if (this._shouldMonitor) {
        console.log('✅ [XHR] 开始监听:', url);
      } else {
        console.log('⏭️ [XHR] 跳过监听:', url);
      }

      return originalOpen.apply(this, arguments);
    };

    xhr.setRequestHeader = function(name, value) {
      if (this._requestInfo) {
        this._requestInfo.headers[name] = value;
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

    xhr.send = function(data) {
      if (this._requestInfo && data) {
        try {
          if (typeof data === 'string') {
            this._requestInfo.body = data;
          } else if (data instanceof FormData) {
            this._requestInfo.body = '[FormData]';
          } else {
            this._requestInfo.body = '[Other Body Type]';
          }
        } catch (error) {
          console.warn('⚠️ [XHR] 处理请求体失败:', error);
        }
      }

      if (this._shouldMonitor && this._requestInfo) {
        console.log('📤 [XHR] 发送请求:', this._requestInfo.method, this._requestInfo.url);
        
        // 监听响应
        this.addEventListener('readystatechange', function() {
          if (this.readyState === 4) { // 请求完成
            const endTime = Date.now();
            console.log('📡 [XHR] 收到响应:', this.status, this.statusText, this._requestInfo.url);
            
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
            } catch (error) {
              console.warn('⚠️ [XHR] 获取响应头失败:', error);
            }
            
            // 获取响应体 - 关键部分
            let responseBody = '';
            try {
              responseBody = this.responseText || this.response || '';
              console.log('📥 [XHR] 成功读取响应体 (长度:', responseBody.length, ')');
              console.log('📄 [XHR] 响应体内容:', responseBody.substring(0, 500));
              
              if (responseBody.length > 500) {
                console.log('📄 [XHR] 响应体总长度:', responseBody.length, '字符');
              }
            } catch (error) {
              console.error('❌ [XHR] 读取响应体失败:', error);
              responseBody = '[Failed to read XHR response]';
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
              domain: extractDomain(this._requestInfo.url),
              isError: isErrorStatus(this.status)
            };
            
            // 发送到content script
            sendToContentScript(networkRequest);
          }
        });
      }

      return originalSend.apply(this, arguments);
    };
  };

  // 监听配置更新
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    const { type, source, data } = event.data;
    if (type === 'NETWORK_MONITOR_CONFIG' && source === 'network-monitor-content-script') {
      console.log('📨 [INJECT] 收到配置更新:', data);
      
      monitorConfig = {
        enabled: data.enabled || false,
        apiPrefixes: data.apiPrefixes || [],
        validationRules: data.validationRules || []
      };
      
      console.log('🔄 [INJECT] 配置已更新:', monitorConfig);
    }
  });

  // 启动拦截
  interceptFetch();
  interceptXHR();

  console.log('🎉 [INJECT] 网络监听器注入完成');
}
