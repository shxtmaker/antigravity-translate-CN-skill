# Antigravity 汉化词典维护与编写规范

本指南面向通过 `/cn` 技能或日常维护中为 Antigravity 增补、排查及修正界面汉化词条的智能体与开发者。

---

## 1. 词典归属与分包规则

所有的汉化词典均位于 `dicts/*.json`，按功能模块分工：

| 词典文件 | 负责功能范围 | 示例文案 |
| :--- | :--- | :--- |
| `v2.24.0.json` | 客户端核心界面、对话区控件、状态卡片、新手引导、操作按钮 | `New Conversation`, `Send`, `Attach file` |
| `common.json` | 全局高频复用通用短语、通用操作标签 | `Save`, `Cancel`, `Confirm`, `Loading...` |
| `menu_nav.json` | 顶部系统菜单栏、右键上下文菜单、侧边导航栏 | `File`, `Edit`, `View`, `Copy`, `Paste` |
| `page_settings.json` | 系统偏好设置面板、模型配置、快捷键设置、隐私权限 | `General`, `Model Selection`, `Appearance` |
| `page_mcp_knowledge.json` | MCP 服务器列表、工具说明、知识库与文档配置 | `MCP Servers`, `Tools`, `Knowledge Bases` |
| `page_agents.json` | Agent 角色定义、系统预设 Agent 列表及配置项 | `Subagents`, `Custom Agents` |
| `page_workspaces.json` | 工作区切换、Worktree 多分支管理、项目路径选择 | `Workspaces`, `Select Directory` |
| `marketplace_plugins.json` | 官方插件市场卡片、分类筛选、安装管理文案 | `Marketplace`, `Installed Plugins` |

---

## 2. 词条录入三大硬性法则

### ① 1:1 标点与大小写严格对齐
- **半角对半角**：英文是什么标点，译文必须严格对齐使用半角英文标点，**严禁替换为全角标点**（如 `.` 对齐 `. `，冒号 `:` 对齐 `:`，圆括号 `()` 对齐 `()`）。
- **末尾标点一致**：英文结尾有句号 `.` 的，译文结尾必须保留 `.`（不得替换为 `。`，更不得漏掉）；英文结尾没有句号的，译文末尾严禁添加任何句号。

### ② 通配单字禁令（防止代码与命令行污染）
- **严禁录入孤立通配单字**：词典支持大小写不敏感匹配，**严禁**录入与系统命令、CLI 选项或内置技能同名的孤立单词（例如严禁单独录入 `"Automation": "自动化"`、`"Plugin": "插件"`、`"Command": "命令"`、`"Branch": "分支"`）。
- **复合短语正常录入**：包含上述词汇的明确词组（如 `"Add Plugin": "添加插件"`、`"Marketplace Plugins": "插件市场"`、`"New Branch": "新建分支"`）均可安全录入。

### ③ 仅翻译产品外层包装文案
- **严格限定**：仅翻译产品自身的界面控件、按钮、弹窗、功能说明与操作反馈。
- **保护禁区**：严禁翻译用户 Prompt 输入、聊天消息历史、网页正文、模型回复文本、代码块、终端控制台输出、错误调用栈、URL 链接、文件路径及环境变量。
- **截图排查非翻译项排除清单**：
  - 工作区 / 项目名称（如自定义目录名）与用户账号姓名 / 邮箱
  - 字体名称（如 `Google Sans`）、字号像素值（如 `14px`）、十六进制色值（如 `#070708`、`#FFFFFF`）
  - 本地磁盘路径（如 `C:\Users\...\Downloads`）
  - 嵌入式品牌与技术专有名词（如 `Antigravity`、`Gemini Live`、`MCP`、`URL`、`CDP`、`WSL`）

---

## 3. 核心高频术语对齐表

新增或补全词条前，优先检索现有词典保持同一概念译法统一：

| 英文源文 / 概念 | 推荐标准译法 | 说明 |
| :--- | :--- | :--- |
| `Agent` / `Subagent` | `智能体` / `子智能体` | 如 `Browser Subagent` -> `浏览器子智能体` |
| `Built-in Browser` / `External Browser` | `内置浏览器` / `外部浏览器` | 浏览器设置页控件及说明统一使用 |
| `Chat` / `Conversation Steps` | `会话` / `会话步骤` | 与 `Chat Settings` -> `会话设置` 对齐 |
| `Give Feedback` / `Provide Feedback` | `提供反馈` | `Send Feedback` -> `发送反馈` |
| `Voice mode` / `Microphone` / `Volume` | `语音模式` / `麦克风` / `音量` | 语音设置项统一译法 |
| `Interface Layout` / `Verbose` | `界面布局` / `详细` | `Default` -> `默认`，`Turbo` -> `极速` |
| `Orchestrator` / `Executor` | `编排器` / `执行器` | 模型设置中多智能体角色统一译法 |
| `Sound` | `声音` | 通知设置声音分组标题，与 `启用智能体的声音通知` 对齐 |

---

## 4. 动态模板文案处理（走引擎正则）

如果文案中包含**动态变量**（如计数 `5 items`、时长 `refreshes in 2 hours`、日期时间、分支名、文件路径等）：
- **禁止在 JSON 中写死单条静态值**；
- 必须在 `localization_engine.js` 中编写带捕获组的正则表达式，动态保留占位符并完成汉化替换。

---

## 5. 词典检索、自检与验证命令

在修改或增补任意 `dicts/*.json` 时，**严禁直接执行 `node localization_engine.js`**，应使用配套校验脚本：

```bash
# 1. 检索现有词典中的已有译法（术语对齐 + 避免重复录入）
node scripts/check_dicts.js --search "<关键词>"

# 2. 校验全部词典 JSON 语法、新增重复键、lowerMap 大小写冲突、标点 1:1 对齐与通配单字禁令
node scripts/check_dicts.js
```
