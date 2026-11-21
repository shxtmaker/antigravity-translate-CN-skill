---
name: cn
description: >-
  Antigravity 简体中文汉化管理与一键重汉化技能。
  当用户输入 /cn、发送界面截图要求完成/补全未汉化部分、询问如何汉化、
  客户端升级后汉化失效需要重新汉化、检测当前汉化状态、排查界面英文残留或维护汉化词典时使用此技能。
  Also triggered by the /cn slash command.
metadata:
  icon: translate
---

# Antigravity 简体中文汉化管理与重汉化技能 (/cn)

本技能专用于管理 Antigravity 桌面客户端的简体中文本地化状态。当用户输入 `/cn` 或询问汉化相关问题时，提供自动诊断、重汉化指引、卸载还原及词典维护等完整支持。

---

## 🚀 快速执行工作流

当用户输入 `/cn` 或发送界面截图要求补全未汉化文案时，请按以下标准流程执行（若已明确提供未汉化截图，可在完成第一步状态确认后直接进入第三步词典补全）：

### 第一步：执行状态自检

首先在后台执行配套的环境诊断脚本，快速获取当前系统的真实汉化状态：

```bash
node scripts/status.js
```
*(若在全局配置目录中调用，请定位至本技能目录执行或指定 `scripts/status.js` 的绝对路径)*

该脚本会返回：
1. **客户端安装路径**（Windows / macOS / Linux 跨平台适配）。
2. **核心文件 `app.asar` 状态**：
   - `已汉化 (Localized)`：已被汉化引擎安全注入。
   - `官方原版英文 (Official English)`：未注入汉化或刚被官方升级覆盖。
3. **备份文件状态**：是否存在 `app.asar.backup`。
4. **客户端运行状态**：当前是否有 Antigravity 正在运行。
5. **本地汉化仓库与词典状态**：`dicts/*.json` 语法校验与词条总数。

---

### 第二步：根据诊断结果提供针对性方案

#### 场景 1：客户端更新后汉化失效 / 首次安装汉化 (`OFFICIAL_ENGLISH`)
- **原因分析**：官方客户端在版本升级时会自动下载并替换 `resources/app.asar`，导致原本注入的汉化补丁被官方英文原版覆盖。
- **安全规范（极其重要）**：
  > [!IMPORTANT]
  > 由于操作系统（尤其 Windows）在客户端运行期间会锁定 `app.asar` 文件，且汉化注入引擎包含结束进程逻辑，**严禁在当前运行中的 AI 会话内直接由代理强制执行 `node localization_engine.js`**，否则会导致 Antigravity 立即闪退、当前会话丢失。
- **用户操作指引**：
  1. 保存当前工作并**彻底退出 Antigravity 客户端**（检查系统托盘确保已完全退出）。
  2. 打开本地汉化仓库目录（默认位于 `~/.gemini/antigravity/scratch/antigravity-desktop-cn`）。
  3. 运行对应的官方安装入口：
     - **Windows**：双击运行 **`双击安装中文汉化.bat`**
     - **macOS**：双击运行 **`双击安装中文汉化.command`** 或在终端执行 `./install.sh`
     - **Linux**：在终端执行 `./install.sh`
  4. 按终端提示按回车选择默认推荐（保留英文 `Antigravity` 品牌标识），等待注入完成提示后重新启动客户端即可。

---

#### 场景 2：汉化处于已激活状态 (`LOCALIZED`)
- 告知用户当前客户端汉化补丁正常运行。
- 如果用户是在某些特定页面遇到了未汉化的英文（漏译或官方新增功能），进入**第三步：词典维护流程**。

---

#### 场景 3：用户需要卸载还原官方英文
- 指导用户在完全退出 Antigravity 客户端后，运行对应的还原脚本：
  - **Windows**：双击运行 **`双击卸载还原官方英文.bat`**
  - **macOS**：双击运行 **`双击卸载还原官方英文.command`**
  - **Linux / macOS 终端**：运行 `./uninstall.sh`

---

## 📖 第三步：特定页面/截图未汉化文案排查与词典维护

当用户反馈某个界面（例如设置页、插件市场、MCP 等）存在英文残留，或直接发送截图要求"完成翻译未完成部分"时，按以下 5 步标准流水线处理：

1. **逐区提取原文并过滤非翻译项**：
   - 完整扫描截图主面板与侧边栏（含底部按钮、次级标签与分段选项），提取纯静态产品 UI 文案。
   - **主动跳过白名单内容**（详见 [词典维护规范](./references/dictionary_guide.md)）：工作区/项目名、账号姓名与邮箱、字体名（如 `Google Sans`）、字号（如 `14px`）、色值（如 `#070708`）、本地路径（如 `C:\Users\...\Downloads`）及嵌入式品牌/模型专有名词（如 `Antigravity`、`Gemini Live`）。
2. **术语对齐与跨词典查重**：
   - 在编辑词典前，先检索现有 `dicts/*.json` 确认规范译法并排查重复键或 `lowerMap` 大小写碰撞：
     ```bash
     node scripts/check_dicts.js --search "<关键词>"
     ```
3. **选择归属词典并 1:1 录入**（详细规范参见 [词典维护规范](./references/dictionary_guide.md)）：
   - `dicts/v2.24.0.json`：主界面、对话流卡片、通用控件。
   - `dicts/common.json`：全局高频通用按钮与基础操作短语。
   - `dicts/page_settings.json`：偏好设置面板（通用、外观、浏览器、模型、快捷键、通知等）。
   - `dicts/page_mcp_knowledge.json`：MCP 与知识库。
   - `dicts/page_agents.json`：Agent 角色与智能体列表。
   - `dicts/page_workspaces.json`：工作区与分支管理。
   - `dicts/marketplace_plugins.json`：插件市场卡片。
   - **核心红线**：
     - **标点 1:1 对齐**：英文是什么标点，译文必须严格使用对应半角标点（严禁将英文句号 `.` 换成中文句号 `。` 或漏掉）。
     - **通配单字禁令**：严禁在字典中录入与命令或技能同名的孤立通配单字（如 `"Automation"`、`"Plugin"`、`"Command"`、`"Branch"`、`"Folder"`）。
     - **动态文本**：包含动态计数、时长、文件名的文案必须走 `localization_engine.js` 正则捕获。
4. **脚本化全量质量校验**：
   ```bash
   node scripts/check_dicts.js
   ```
   自动校验全部词典的 JSON 语法、新增重复键、`lowerMap` 冲突、标点 1:1 对齐与通配单字禁令。**严禁**在开发修改字典时引入或执行 `localization_engine.js`，防止误杀正在运行的进程。
5. **安全重注入生效指引**：
   - 若诊断报告显示客户端正在运行，向用户汇报新增词条范围与校验结果，并指引其**彻底退出 Antigravity 客户端后**双击运行官方安装脚本（如 `双击安装中文汉化.bat`）重新注入使改动生效。

---

## 🛡️ 核心安全边界

1. **绝不破坏用户私有内容**：不翻译已发送的聊天消息正文、代码、控制台终端输出、错误堆栈与环境变量。
2. **保护 Git 文件属性**：Windows 下维护批处理脚本需严格保持 GBK/CP936 编码与 CRLF 换行；macOS/Linux 脚本保持 LF 换行与可执行权限位。
