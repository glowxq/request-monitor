# 📦 安装指南

## 🚀 快速安装

### 方式一：Chrome应用商店（推荐）

1. 打开 [Chrome应用商店](https://chrome.google.com/webstore)
2. 搜索"网络请求监听器"或"Network Request Monitor"
3. 点击"添加至Chrome"按钮
4. 确认安装权限
5. 安装完成后，在浏览器工具栏会出现插件图标

### 方式二：本地安装开发版

#### 下载方式
```bash
# 克隆项目
git clone https://github.com/your-username/network-request-monitor.git
cd network-request-monitor

# 安装依赖
npm install

# 构建项目
npm run build
```

#### 安装步骤
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录
6. 安装完成

### 方式三：CRX文件安装

1. 下载最新的 `dist.crx` 文件
2. 打开 `chrome://extensions/`
3. 开启"开发者模式"
4. 将 `.crx` 文件拖拽到页面中
5. 点击"添加扩展程序"确认安装

## ⚙️ 首次配置

### 1. 基本配置

安装完成后，点击插件图标进行首次配置：

```
1. 添加API前缀
   - 点击"添加API前缀"
   - 输入需要监听的接口前缀，如：
     https://api.example.com
     https://service.example.com/api

2. 配置域名限制（可选）
   - 开启"域名限制"
   - 添加允许的域名，如：
     example.com
     test.example.com

3. 开始监听
   - 点击"开始监听"按钮
   - 插件开始自动记录匹配的网络请求
```

### 2. 高级配置

```
响应验证规则：
- 配置业务状态码规则
- 自定义异常识别逻辑

URL替换规则：
- 配置环境切换规则
- 实现一键环境切换

快速复制配置：
- 设置响应头字段
- 设置响应体字段
- 开启调试信息复制
```

## 🔧 权限说明

插件需要以下权限：

| 权限 | 用途 | 必需性 |
|------|------|--------|
| `activeTab` | 访问当前标签页 | 必需 |
| `storage` | 保存配置信息 | 必需 |
| `webRequest` | 监听网络请求 | 必需 |
| `scripting` | 注入脚本 | 必需 |
| `declarativeNetRequest` | 请求拦截 | 必需 |
| `<all_urls>` | 访问所有网站 | 必需 |

## 🛠️ 故障排除

### 常见问题

#### 1. 插件无法加载
```
问题：插件图标显示为灰色或无法点击
解决：
1. 检查Chrome版本（需要88+）
2. 重新加载插件
3. 检查是否有权限限制
```

#### 2. 无法监听到请求
```
问题：配置了API前缀但没有记录到请求
解决：
1. 检查API前缀配置是否正确
2. 确认域名限制设置
3. 检查是否开启了监听
4. 刷新页面重新测试
```

#### 3. 弹窗显示异常
```
问题：弹窗被压扁或显示不完整
解决：
1. 重新加载插件
2. 检查浏览器缩放比例
3. 尝试重启浏览器
```

#### 4. 数据丢失
```
问题：刷新页面后请求记录消失
解决：
1. 检查存储权限
2. 确认配置中的最大记录数设置
3. 检查浏览器存储空间
```

### 调试模式

开启调试模式查看详细日志：

```javascript
// 在控制台执行
chrome.storage.local.set({debugMode: true})

// 查看调试日志
chrome.storage.local.get('debugLogs', (result) => {
  console.log(result.debugLogs)
})
```

## 🔄 更新

### 自动更新
- Chrome应用商店版本会自动更新
- 更新后会保留所有配置信息

### 手动更新
```bash
# 拉取最新代码
git pull origin main

# 重新构建
npm run build

# 在chrome://extensions/中点击刷新按钮
```

## 📞 技术支持

如果遇到问题，可以通过以下方式获取帮助：

- **GitHub Issues**: [提交问题](https://github.com/your-username/network-request-monitor/issues)
- **微信**: glowxq（请备注：网络监听器）
- **邮箱**: support@example.com

## 📋 系统要求

- **浏览器**: Chrome 88+ / Edge 88+
- **操作系统**: Windows 10+ / macOS 10.14+ / Linux
- **内存**: 建议4GB以上
- **存储**: 至少50MB可用空间
