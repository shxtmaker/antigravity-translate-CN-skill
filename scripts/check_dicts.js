#!/usr/bin/env node

/**
 * Antigravity 汉化词典质量校验与术语检索脚本
 * 用法:
 *   node check_dicts.js                 # 执行全量词典校验与 git 增量变更核查
 *   node check_dicts.js --search <词>   # 检索现有词典中的已有译法，保持术语一致
 *   node check_dicts.js --json          # 以 JSON 格式输出校验结果
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FORBIDDEN_SINGLE_WORDS = new Set([
    'automation',
    'plugin',
    'command',
    'branch',
    'folder'
]);

const KNOWN_LEGACY_EXCEPTIONS = new Set([
    'v2.24.0.json::Branch'
]);

function findRepoDir() {
    const candidateDirs = [
        path.resolve(__dirname, '..', '..', '..'),
        path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', 'scratch', 'antigravity-desktop-cn'),
        process.cwd()
    ];
    for (const dir of candidateDirs) {
        if (dir && fs.existsSync(path.join(dir, 'localization_engine.js')) && fs.existsSync(path.join(dir, 'dicts'))) {
            return dir;
        }
    }
    return null;
}

function getChangedDictKeys(repoDir) {
    const changed = new Map();
    try {
        const diffOut = execFileSync(
            'git',
            ['diff', '-U0', '--', 'dicts'],
            { cwd: repoDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
        );
        let currentFile = null;
        const removedLines = new Map();
        const addedEntries = new Map();
        for (const line of diffOut.split(/\r?\n/)) {
            const fileMatch = line.match(/^\+\+\+\s+b\/dicts\/(.+\.json)$/);
            if (fileMatch) {
                currentFile = fileMatch[1];
                if (!removedLines.has(currentFile)) removedLines.set(currentFile, new Set());
                if (!addedEntries.has(currentFile)) addedEntries.set(currentFile, []);
                continue;
            }
            if (!currentFile) continue;
            if (line.startsWith('-') && !line.startsWith('---')) {
                removedLines.get(currentFile).add(line.slice(1).trim().replace(/,$/, ''));
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                const raw = line.slice(1).trim().replace(/,$/, '');
                const entryMatch = raw.match(/^"((?:[^"\\]|\\.)*)"\s*:/);
                if (entryMatch) {
                    try {
                        addedEntries.get(currentFile).push({
                            key: JSON.parse(`"${entryMatch[1]}"`),
                            normalizedLine: raw
                        });
                    } catch (_) {}
                }
            }
        }
        for (const [file, entries] of addedEntries.entries()) {
            const removed = removedLines.get(file) || new Set();
            const set = new Set();
            for (const entry of entries) {
                if (!removed.has(entry.normalizedLine)) set.add(entry.key);
            }
            changed.set(file, set);
        }
    } catch (_) {
        // Non-git directory or git unavailable; skip diff scoping gracefully.
    }
    return changed;
}

function checkPunctuationAlignment(key, value) {
    const issues = [];
    if (/[。：？！]/.test(value)) {
        issues.push('译文包含全角中文标点 (。：？！)，请对齐为半角英文标点');
    }

    const keyEllipsis = key.endsWith('...') || key.endsWith('…');
    const valEllipsis = value.endsWith('...') || value.endsWith('…');
    if (keyEllipsis !== valEllipsis) {
        issues.push('末尾省略号 (...) 不对齐');
    } else if (!keyEllipsis) {
        const keyDot = key.endsWith('.');
        const valDot = value.endsWith('.');
        if (keyDot !== valDot) {
            issues.push(keyDot ? '原文以英文句号 . 结尾，译文缺少末尾 .' : '原文末尾无句号，译文不应添加末尾 .');
        }
    }

    for (const mark of ['?', '!', ':']) {
        if (key.endsWith(mark) !== value.endsWith(mark)) {
            issues.push(`末尾标点 ${mark} 未 1:1 对齐`);
        }
    }
    return issues;
}

function runSearch(repoDir, query) {
    const dictsDir = path.join(repoDir, 'dicts');
    const files = fs.readdirSync(dictsDir).filter(f => f.endsWith('.json')).sort();
    const qLower = query.toLowerCase();
    const matches = [];

    for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(dictsDir, file), 'utf8'));
        for (const [k, v] of Object.entries(data)) {
            if (k.toLowerCase().includes(qLower) || String(v).toLowerCase().includes(qLower)) {
                matches.push({ file, key: k, value: v });
            }
        }
    }

    if (matches.length === 0) {
        console.log(`未在 dicts/*.json 中找到包含 "${query}" 的词条。`);
        return;
    }
    console.log(`在 dicts/*.json 中找到 ${matches.length} 条与 "${query}" 相关的词条：`);
    for (const m of matches) {
        console.log(`- [${m.file}] ${JSON.stringify(m.key)} -> ${JSON.stringify(m.value)}`);
    }
}

function runAudit(repoDir, isJson) {
    const dictsDir = path.join(repoDir, 'dicts');
    const files = fs.readdirSync(dictsDir).filter(f => f.endsWith('.json')).sort();
    const changedKeys = getChangedDictKeys(repoDir);

    const syntaxErrors = [];
    const errors = [];
    const warnings = [];
    const fileStats = [];
    const seenExact = new Map();
    const seenLower = new Map();
    let totalEntries = 0;

    for (const file of files) {
        const fullPath = path.join(dictsDir, file);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        } catch (err) {
            syntaxErrors.push({ file, error: err.message });
            continue;
        }

        const keys = Object.keys(data);
        totalEntries += keys.length;
        fileStats.push({ file, count: keys.length });
        const fileChanged = changedKeys.get(file);

        for (const [key, value] of Object.entries(data)) {
            const isChanged = !!(fileChanged && fileChanged.has(key));
            const lower = key.toLowerCase();

            if (typeof value !== 'string' || !value.trim()) {
                errors.push({ file, key, reason: '译文必须为非空字符串' });
                continue;
            }

            if (seenExact.has(key)) {
                const record = { file, key, conflictWith: seenExact.get(key) };
                if (isChanged) errors.push({ ...record, reason: '新增/修改词条与其他词典存在完全重复键' });
                else warnings.push({ ...record, reason: '跨文件重复键 (历史遗留)' });
            } else {
                seenExact.set(key, file);
            }

            if (seenLower.has(lower) && seenLower.get(lower).key !== key) {
                const prev = seenLower.get(lower);
                const record = { file, key, conflictWith: `${prev.file}: ${JSON.stringify(prev.key)}` };
                if (isChanged) errors.push({ ...record, reason: '新增/修改词条触发 lowerMap 大小写冲突' });
                else warnings.push({ ...record, reason: 'lowerMap 大小写碰撞 (历史遗留)' });
            } else if (!seenLower.has(lower)) {
                seenLower.set(lower, { file, key });
            }

            if (FORBIDDEN_SINGLE_WORDS.has(lower) && !KNOWN_LEGACY_EXCEPTIONS.has(`${file}::${key}`)) {
                errors.push({ file, key, reason: '命中通配单字禁令，禁止直接录入该孤立单词' });
            }

            const punctIssues = checkPunctuationAlignment(key, value);
            for (const issue of punctIssues) {
                const item = { file, key, value, reason: issue };
                if (isChanged || !issue.includes('省略号')) {
                    errors.push(item);
                } else {
                    warnings.push(item);
                }
            }
        }
    }

    const report = {
        repoDir,
        valid: syntaxErrors.length === 0 && errors.length === 0,
        fileCount: files.length,
        totalEntries,
        uniqueEntries: seenExact.size,
        fileStats,
        syntaxErrors,
        errors,
        warnings
    };

    if (isJson) {
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.valid ? 0 : 1);
    }

    console.log('====================================================');
    console.log('  Antigravity 汉化词典质量校验报告 (/cn)');
    console.log('====================================================\n');
    console.log(`📚 [词典目录] ${dictsDir}`);
    console.log(`📊 [词条统计] ${files.length} 个词典文件，共 ${totalEntries} 条（去重后 ${seenExact.size} 条）`);

    if (syntaxErrors.length > 0) {
        console.log('\n❌ [JSON 语法错误]');
        for (const item of syntaxErrors) console.log(`  - ${item.file}: ${item.error}`);
    }
    if (errors.length > 0) {
        console.log(`\n❌ [规范违规] (${errors.length} 项)`);
        for (const item of errors) {
            console.log(`  - [${item.file}] ${JSON.stringify(item.key)}: ${item.reason}${item.conflictWith ? ` (${item.conflictWith})` : ''}`);
        }
    }
    if (warnings.length > 0) {
        console.log(`\n⚠️ [历史提示] (${warnings.length} 项跨文件重复或大小写碰撞)`);
    }

    console.log('\n----------------------------------------------------');
    if (report.valid) {
        console.log('✅ 校验通过：JSON 语法、标点 1:1 对齐及安全边界全部合规！');
    } else {
        console.log('❌ 校验未通过：请先修复上述错误后再提示用户安装。');
    }
    console.log('====================================================\n');

    process.exit(report.valid ? 0 : 1);
}

function main() {
    const args = process.argv.slice(2);
    const repoDir = findRepoDir();
    if (!repoDir) {
        console.error('❌ 未找到 antigravity-desktop-cn 仓库目录（缺少 localization_engine.js 或 dicts/）。');
        process.exit(1);
    }

    const searchIdx = args.indexOf('--search');
    if (searchIdx !== -1) {
        const query = args[searchIdx + 1];
        if (!query) {
            console.error('用法: node check_dicts.js --search <关键词>');
            process.exit(1);
        }
        runSearch(repoDir, query);
        return;
    }

    runAudit(repoDir, args.includes('--json'));
}

main();
