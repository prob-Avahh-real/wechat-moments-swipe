# 微信朋友圈滑动浏览 (WeChat Moments Swipe)

为微信网页版朋友圈添加视频号式的滑动浏览体验，支持划走内容但不屏蔽好友。

## 功能概述

- **滑动浏览**：像刷视频号一样上下滑动浏览朋友圈
- **智能跳过**：划走当前内容，但**不屏蔽该好友**，下次仍能看到其朋友圈
- **手势支持**：支持鼠标滚轮、触摸滑动、键盘方向键多种操作方式
- **临时标记**：被划走的内容仅本次会话隐藏，刷新后恢复

## 安装使用

### 1. 安装 Tampermonkey 扩展

- Chrome: [Chrome 网上应用店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox: [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Edge: [Edge 外接程序](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. 安装脚本

1. 点击 Tampermonkey 扩展图标 → **添加新脚本**
2. 删除默认内容，将 `wechat-moments-swipe.user.js` 完整代码粘贴进去
3. 按 `Ctrl+S` 保存

### 3. 使用

1. 打开微信网页版（https://wx.qq.com）并登录
2. 进入朋友圈页面
3. 点击右下角绿色悬浮按钮 ⬆ 激活滑动模式
4. 开始滑动浏览！

## 操作说明

| 操作 | 功能 |
|------|------|
| 鼠标滚轮 | 上下滑动浏览 |
| 触摸滑动 | 移动端上下滑动 |
| ↑ / ↓ 方向键 | 切换上一条/下一条 |
| S 键 | 划走当前内容 |
| ESC 键 | 退出滑动模式 |
| 右侧悬浮按钮 | 上一条 / 下一条 / 退出 |
| 底部操作栏 | 划走 / 点赞 / 评论 |

## 文件结构

```
wechat-moments-swipe/
├── wechat-moments-swipe.user.js   # 主油猴脚本
├── README.md                       # 使用说明
└── design.md                       # 产品设计文档
```

## 技术说明

- **目标平台**: 微信网页版 `https://wx.qq.com` 或 `https://web.wechat.com`
- **实现方式**: 油猴脚本 (Tampermonkey/Greasemonkey)
- **核心功能**:
  - 滑动容器：全屏滑动视图，平滑过渡动画
  - 内容捕获：监听朋友圈 DOM 变化，拦截并缓存数据
  - 交互控制：鼠标滚轮、触摸滑动、键盘方向键
  - 跳过逻辑：标记为「已跳过」，不调用屏蔽 API
  - UI 增强：悬浮操作按钮、进度指示器

## 注意事项

- 微信网页版 API 可能随时变更，需要适配更新
- 滑动模式作为可选开关，保留原有列表视图
- 遵守微信使用条款，仅本地修改不干扰服务端
- 划走功能仅在本次会话有效，刷新页面后恢复

## License

MIT License
