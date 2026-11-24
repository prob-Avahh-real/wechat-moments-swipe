# wechat-moments-swipe（实验脚本）

微信网页版朋友圈视频号式上下滑动浏览 Tampermonkey 用户脚本（`wechat-moments-swipe.user.js`）。

## 用途与 Target 判定

| 平台 | 需要? | 方式 |
|------|-------|------|
| 移动端 | 不适用 | 浏览器 Tampermonkey Userscript（`.user.js`） |
| 智能硬件 | 不适用 | 网页交互增强脚本，无穿戴设备输入 |

## 命令

```bash
node --check wechat-moments-swipe.user.js
```

## Harness / Loop（助手）

- 遵循根 `/Users/skat/AGENTS.md`：**Harness Engineering** + **Loop Engineering**
- 单文件 Userscript 实验：当前无自动化测试传感器（诚实保留 `no test sensor`），改动前先核查选择器兼容性

## 验证环 / Done

```bash
node --check wechat-moments-swipe.user.js
```

**Done 示例**：Userscript 语法检查通过，头部 `@match` 元数据完整且滑动跳过逻辑不修改好友屏蔽状态。
