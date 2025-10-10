# 📸 截图说明

这个目录用于存放项目的功能截图。请按照以下规范添加截图：

## 📋 需要的截图

### 1. 主界面截图
**文件名**: `main-interface.png`
**内容**: 
- 插件主界面，显示请求列表
- 包含监听状态、统计信息
- 展示筛选和搜索功能

### 2. 自动监听功能
**文件名**: `auto-monitoring.png`
**内容**:
- 显示正在监听的状态
- 实时记录的请求列表
- 不同状态的请求分类（成功、失败、异常）

### 3. 智能分类功能
**文件名**: `smart-classification.png`
**内容**:
- 问题接口筛选界面
- 显示错误请求、验证异常等分类
- 统计数据展示

### 4. 请求详情弹窗
**文件名**: `request-detail.png`
**内容**:
- 请求详情弹窗界面
- 包含请求头、响应体、CURL命令等
- 展示复制和重试功能

### 5. 快速复现功能
**文件名**: `quick-reproduce.png`
**内容**:
- CURL命令生成界面
- 请求重试功能
- URL替换规则配置

### 6. 调试信息复制
**文件名**: `debug-info.png`
**内容**:
- 调试信息复制功能
- 格式化的调试输出
- 包含完整上下文信息

### 7. 配置管理
**文件名**: `config-management.png`
**内容**:
- API前缀配置界面
- 域名限制设置
- 校验规则配置

## 📐 截图规范

### 尺寸要求
- **主要功能截图**: 1200x800px
- **详情弹窗截图**: 800x600px
- **配置界面截图**: 1000x700px

### 质量要求
- 分辨率：至少1080p
- 格式：PNG（支持透明背景）
- 压缩：适度压缩，保持清晰度

### 内容要求
- 使用真实的示例数据
- 确保界面完整，无截断
- 突出展示核心功能
- 避免敏感信息（真实API地址、token等）

### 示例数据建议
```json
{
  "api_prefixes": [
    "https://api.example.com",
    "https://service-test.example.com/api"
  ],
  "sample_requests": [
    {
      "url": "https://api.example.com/user/profile",
      "method": "GET",
      "status": 200,
      "duration": "245ms"
    },
    {
      "url": "https://api.example.com/order/create",
      "method": "POST", 
      "status": 500,
      "duration": "1.2s"
    }
  ]
}
```

## 🎨 截图工具推荐

### Chrome扩展
- **Awesome Screenshot**: 网页截图工具
- **FireShot**: 全页面截图
- **Lightshot**: 区域截图

### 桌面工具
- **Snagit**: 专业截图编辑工具
- **CleanShot X** (Mac): 高质量截图工具
- **Greenshot** (Windows): 免费开源截图工具

### 在线工具
- **Figma**: 设计稿截图
- **Canva**: 图片编辑和美化

## 📝 截图清单

- [ ] main-interface.png - 主界面
- [ ] auto-monitoring.png - 自动监听
- [ ] smart-classification.png - 智能分类  
- [ ] request-detail.png - 请求详情
- [ ] quick-reproduce.png - 快速复现
- [ ] debug-info.png - 调试信息
- [ ] config-management.png - 配置管理

## 💡 截图技巧

1. **统一风格**: 保持截图的视觉风格一致
2. **突出重点**: 使用箭头、高亮等方式标注关键功能
3. **完整展示**: 确保功能的完整操作流程都有体现
4. **清晰可读**: 文字和界面元素要清晰可读
5. **真实场景**: 使用贴近真实使用场景的示例数据

完成截图后，请删除此说明文件。
