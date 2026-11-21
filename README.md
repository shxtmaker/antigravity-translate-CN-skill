# Antigravity 简体中文汉化管理技能 (`/cn`)

用于管理 Antigravity 桌面客户端简体中文本地化状态的 Skill，支持环境自检、升级后重汉化指引、截图漏译排查与词典自动化质量校验。

## 目录结构

```text
antigravity-translate-CN-skill/
├── SKILL.md                       # 技能主指令（支持 /cn 与截图漏译触发）
├── references/
│   └── dictionary_guide.md        # 词典分包、标点 1:1 对齐与术语规范
└── scripts/
    ├── status.js                  # 跨平台环境、app.asar 与进程状态诊断
    └── check_dicts.js             # 词典检索 (--search) 与质量校验脚本
```

## 安装方式

将本仓库克隆至 Antigravity 全局技能目录或工作区技能目录即可使用：

```bash
# 全局安装（推荐）
git clone https://github.com/shxtmaker/antigravity-translate-CN-skill.git ~/.gemini/config/skills/cn
```

> 配套本地汉化引擎仓库默认位于 `~/.gemini/antigravity/scratch/antigravity-desktop-cn`。

## 常用脚本

```bash
# 1. 诊断客户端安装路径、app.asar 汉化状态与词典语法
node scripts/status.js

# 2. 检索现有词典术语译法
node scripts/check_dicts.js --search "Browser Subagent"

# 3. 校验全部词典的 JSON 语法、重复键、大小写冲突、标点对齐与通配单字禁令
node scripts/check_dicts.js
```
