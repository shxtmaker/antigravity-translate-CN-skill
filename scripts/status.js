#!/usr/bin/env node

/**
 * Antigravity 汉化状态与环境诊断脚本
 * 支持 Windows / macOS / Linux
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findAntigravityInstall() {
    const candidates = [];
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA;
        if (localAppData) {
            candidates.push(path.join(localAppData, 'Programs', 'antigravity'));
            candidates.push(path.join(localAppData, 'antigravity'));
        }
        const programFiles = process.env['ProgramFiles'];
        if (programFiles) candidates.push(path.join(programFiles, 'Antigravity'));
        const programFilesX86 = process.env['ProgramFiles(x86)'];
        if (programFilesX86) candidates.push(path.join(programFilesX86, 'Antigravity'));
        for (const drive of ['C', 'D', 'E', 'F']) {
            candidates.push(`${drive}:\\Programs\\Antigravity`);
            candidates.push(`${drive}:\\Antigravity`);
        }
    } else if (process.platform === 'darwin') {
        candidates.push('/Applications/Antigravity.app');
        if (process.env.HOME) {
            candidates.push(path.join(process.env.HOME, 'Applications', 'Antigravity.app'));
        }
    } else {
        candidates.push('/opt/Antigravity', '/usr/lib/antigravity', '/usr/share/antigravity');
        if (process.env.HOME) {
            candidates.push(path.join(process.env.HOME, '.local', 'share', 'antigravity'));
            candidates.push(path.join(process.env.HOME, '.local', 'share', 'Antigravity'));
        }
    }

    for (const dir of candidates) {
        if (!fs.existsSync(dir)) continue;
        const asarPath = process.platform === 'darwin'
            ? path.join(dir, 'Contents', 'Resources', 'app.asar')
            : path.join(dir, 'resources', 'app.asar');
        if (fs.existsSync(asarPath)) {
            return { installDir: dir, asarPath };
        }
    }
    return null;
}

function checkRunningProcesses() {
    try {
        if (process.platform === 'win32') {
            const out = execSync('tasklist /FI "IMAGENAME eq antigravity.exe" /NH', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            const matches = out.match(/antigravity\.exe/gi);
            return { running: !!(matches && matches.length > 0), count: matches ? matches.length : 0 };
        } else {
            const out = execSync('pgrep -i antigravity', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            const pids = out.trim().split(/\s+/).filter(Boolean);
            return { running: pids.length > 0, count: pids.length };
        }
    } catch (e) {
        return { running: false, count: 0 };
    }
}

function checkAsarDetails(asarPath) {
    if (!fs.existsSync(asarPath)) {
        return { exists: false, isLocalized: false, hasBackup: false };
    }
    const stat = fs.statSync(asarPath);
    let isLocalized = false;
    try {
        const fd = fs.openSync(asarPath, 'r');
        const buf = Buffer.alloc(Math.min(stat.size, 5 * 1024 * 1024));
        fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        const text = buf.toString('utf8');
        isLocalized = text.includes('AG_LOCALIZATION_START') || text.includes('__agTranslateContextMenuItems');
    } catch (e) {}

    const backupPath = asarPath + '.backup';
    const hasBackup = fs.existsSync(backupPath);
    let backupStat = null;
    if (hasBackup) {
        try { backupStat = fs.statSync(backupPath); } catch (e) {}
    }

    return {
        exists: true,
        sizeBytes: stat.size,
        mtime: stat.mtime.toLocaleString(),
        isLocalized,
        hasBackup,
        backupPath: hasBackup ? backupPath : null,
        backupMtime: backupStat ? backupStat.mtime.toLocaleString() : null
    };
}

function findRepoDir() {
    const candidateDirs = [
        path.resolve(__dirname, '..', '..', '..'),
        path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', 'scratch', 'antigravity-desktop-cn'),
        process.cwd()
    ];
    for (const d of candidateDirs) {
        if (fs.existsSync(path.join(d, 'localization_engine.js')) && fs.existsSync(path.join(d, 'dicts'))) {
            return d;
        }
    }
    return null;
}

function validateDicts(repoDir) {
    if (!repoDir) return { valid: false, fileCount: 0, totalEntries: 0 };
    const dictsDir = path.join(repoDir, 'dicts');
    if (!fs.existsSync(dictsDir)) return { valid: false, fileCount: 0, totalEntries: 0 };

    try {
        const files = fs.readdirSync(dictsDir).filter(f => f.endsWith('.json'));
        let totalEntries = 0;
        for (const file of files) {
            const raw = fs.readFileSync(path.join(dictsDir, file), 'utf8');
            const parsed = JSON.parse(raw);
            totalEntries += Object.keys(parsed).length;
        }
        return { valid: true, fileCount: files.length, totalEntries, files };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

function main() {
    const isJson = process.argv.includes('--json');
    const installInfo = findAntigravityInstall();
    const processInfo = checkRunningProcesses();
    const asarInfo = installInfo ? checkAsarDetails(installInfo.asarPath) : null;
    const repoDir = findRepoDir();
    const dictsInfo = validateDicts(repoDir);

    const report = {
        platform: process.platform,
        nodeVersion: process.version,
        antigravity: {
            installed: !!installInfo,
            installDir: installInfo ? installInfo.installDir : null,
            asarPath: installInfo ? installInfo.asarPath : null,
            asar: asarInfo,
            process: processInfo
        },
        localizationRepo: {
            found: !!repoDir,
            repoDir: repoDir,
            dicts: dictsInfo
        },
        summary: {
            status: !installInfo ? 'NOT_INSTALLED'
                : asarInfo && asarInfo.isLocalized ? 'LOCALIZED'
                : 'OFFICIAL_ENGLISH',
            canInject: !!(installInfo && repoDir && dictsInfo.valid),
            isProcessRunning: processInfo.running
        }
    };

    if (isJson) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    console.log('====================================================');
    console.log('  Antigravity 简体中文汉化环境诊断报告 (/cn)');
    console.log('====================================================\n');

    console.log(`[平台环境] OS: ${process.platform} | Node.js: ${process.version}`);

    if (!installInfo) {
        console.log('\n❌ [未检测到 Antigravity 安装目录] 请确认客户端是否已正确安装。');
    } else {
        console.log(`\n📁 [安装路径] ${installInfo.installDir}`);
        console.log(`📦 [核心文件] ${installInfo.asarPath}`);
        console.log(`   - 文件修改时间: ${asarInfo.mtime}`);
        console.log(`   - 汉化注入状态: ${asarInfo.isLocalized ? '🟢 已汉化 (Localized)' : '⚪ 官方原版英文 (Official English)'}`);
        console.log(`   - 官方备份状态: ${asarInfo.hasBackup ? `🟢 已备份 (${asarInfo.backupMtime})` : '⚪ 无备份'}`);
    }

    console.log(`\n⚙️ [进程状态] ${processInfo.running ? `⚠️ 客户端正在运行 (${processInfo.count} 个进程)` : '🟢 客户端未运行'}`);

    if (repoDir) {
        console.log(`\n📚 [汉化仓库] ${repoDir}`);
        console.log(`   - 词典状态: ${dictsInfo.valid ? `🟢 语法校验通过 (${dictsInfo.fileCount} 个词典文件，共 ${dictsInfo.totalEntries} 条词条)` : `❌ 校验失败: ${dictsInfo.error}`}`);
    } else {
        console.log('\n❌ [未找到汉化源码包] 请确认 antigravity-desktop-cn 是否存在。');
    }

    console.log('\n----------------------------------------------------');
    if (report.summary.status === 'LOCALIZED') {
        console.log('✅ 结论: 汉化处于已激活状态！若个别界面显示英文，可补充词典词条。');
    } else if (report.summary.status === 'OFFICIAL_ENGLISH') {
        console.log('💡 结论: 核心文件为官方英文（可能刚更新或未安装）。');
        console.log('   请完全退出 Antigravity 客户端后，运行安装脚本重新汉化！');
    } else {
        console.log('⚠️ 结论: 诊断异常，请检查安装路径与权限。');
    }
    console.log('====================================================\n');
}

main();
