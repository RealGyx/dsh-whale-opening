# dsh-whale-opening

单窗口开屏插件 0.3.1。动画只占主窗口内容区，保留原生标题栏和窗口按钮，无子窗口、无侧栏页面。

本仓库由两部分组成：**插件本体**（装进 DSH 即可运行）与**可选的桌面补丁器**（在你自己的机器上给已安装的 DSH 打补丁，换取真正的首屏遮罩）。仓库不含、也不分发任何 DeepSeek 应用代码。

## 仓库里有什么

| 部分 | 内容 |
|---|---|
| 插件本体 | `package.json`、`cordis.patch.yml`、`index.js`、`client.js`、`README.md`、`LICENSE`、`media/opening-4k-h264.mp4`、`media/first-frame.jpg`，共 8 个文件 |
| `patcher/` | 桌面补丁器：asar 读写、文本变换、CLI 与 `.cmd` 包装，全部为本仓库自有代码 |
| 不含 | 历史版本、备份、原生子窗口脚本、开发测试资源，以及任何 DSH/DeepSeek 应用文件 |

## 行为

标「需桌面补丁」的行为只有打了补丁才成立；仅安装插件本体时按表格下方说明降级。

- （需桌面补丁）首帧遮罩先于主界面显示；视频从主窗口放行后开始播放。
- （需桌面补丁）真实界面在隐藏状态截图，裁掉标题栏，后半段使用此启动快照；仅内存保存，不上传。
- （需桌面补丁）缩放/调整窗口后快照失配时回退展示页。
- 宿主启动不等待插件动画，避免循环等待；窗口显示单独等待动画就绪，超时安全跳过且不迟到补播。
- Esc 跳过；尊重系统减少动态效果设置。
- （需桌面补丁）桌面按本次进程启动握手播放，不使用浏览器旧播放标记；仅装插件时浏览器每标签页会话播放一次。

## 安装

### 1. 插件本体（两种形态都需要）

```bash
dsh plugin add github:RealGyx/dsh-whale-opening
```

多 profile 时用 `dsh plugin --profile <profile名> add github:RealGyx/dsh-whale-opening`；同一 spec 也可填入插件管理器的包名输入框。

- `dsh plugin` 把参数转给 pnpm：GitHub 仓库解析为 codeload tarball，锁文件钉住具体 commit 与完整性哈希；装完自动写入 profile 的 `dsh.profile.bundles` 并启用。
- 从插件管理器面板安装时，后台 `installBundle` 会先做一次 `git ls-remote` 探活（默认 5 秒超时），再由 pnpm 下载；纯命令行安装不经过这一步。
- 已在 DSH 0.2.1-rc.5 / pnpm 11.28.5 实测：约 4 分钟完成，profile 约 34 MB。

- **前置**：`pnpm` 在 PATH 上（`dsh plugin` 经它安装）；走面板探活路径时另需 `git`。包内含约 35 MB 视频，首次安装需下载整包。
- **版本要求**：`engines.dsh` 为 `>=0.2.0-rc.1 <0.3.0`。版本不符会以 `incompatible-version` 拒绝，可用 `dsh plugin allow-version` 或插件管理器授予豁免后重试。
- **更新**：用同一 spec 再执行一次 `add`。
- **卸载**：`dsh plugin remove dsh-whale-opening`。

### 2. 可选：桌面首屏遮罩（在本机打补丁）

先 `git clone` 本仓库，在仓库目录里运行；DSH 桌面版需处于关闭状态。补丁器只读写**你自己机器上**的 `app.asar`。

```cmd
patcher\patch.cmd
patcher\patch.cmd --apply
patcher\patch.cmd --install "D:\DeepSeek Harness"
patcher\patch.cmd --restore
```

| 命令 | 作用 |
|---|---|
| `patcher\patch.cmd` | 只检查（dry run），不写任何文件 |
| `patcher\patch.cmd --apply` | 写入补丁 |
| `patcher\patch.cmd --install "<目录>"` | 自动探测失败时指定 DSH 安装目录 |
| `patcher\patch.cmd --restore` | 用最近一次备份回滚 |

补丁器做的事：

1. 从 `resources\app.asar` 读出 `lib/main.js` 与 `lib/preload-app.cjs`；
2. 在 main 的 win32 分支前插入启动桥，把主窗口的显示时机改为经 `schedule/present` 协调，并核对主窗口仍以隐藏状态创建；
3. 在 preload 里把 `opening` API 换成 `singlePrepare/singleReady/singleFinish`，并追加首帧遮罩片段（海报内联为 data URL）；
4. 其余约 1.6 万个条目按原字节复制，然后校验新档、备份旧档、改名替换。

安全措施：锚点不匹配时 **退出码 2 且不写任何文件**；DSH 正在运行（同安装目录的进程）时直接拒绝，**不会结束或重启你的进程**；写入前备份 `resources\app.asar.bak-<yyyymmdd-hhmmss>`，先写 `app.asar.new` 并校验后再改名；重复执行是幂等的（同样的输入产出同样的文件）。

运行环境：Windows；`patch.cmd` 用 DSH 自带的 Electron 运行时当 node，不必另装 Node.js；如已装 Node.js 18+，也可直接 `node patcher\patch.mjs [选项]`（`--help` 看全部选项）。

### 两种安装形态的效果差异

| 安装方式 | 开屏时机 | 播放次数 | 后半段画面 |
|---|---|---|---|
| 仅装插件本体 | 界面加载完成后覆盖上来，非首屏遮罩 | 浏览器每标签页会话一次 | 展示页 |
| 插件本体 + 桌面补丁 | 主窗口放行后的首屏遮罩 | 按本次进程启动握手 | 真实界面快照 |

## 为什么补丁不随仓库分发

DSH 的桌面集成需要改写 `app.asar` 里的两个宿主文件。把改好的 `app.asar` 放进仓库等于分发一份完整的第三方应用副本（约 175 MB），并对其代码声明本项目的 MIT 许可——这既不合适也不合法。因此本仓库只提供**补丁器**：它在运行时作用于用户自己已安装的档案，不携带、不转存、不分发任何第三方代码。

`LICENSE` 的 MIT 授权仅覆盖本仓库自有代码（插件本体与 `patcher/` 下的全部文件）。第三方应用不在本仓库内，其许可与本项目无关。

### 风险与边界

- 补丁修改的是已安装的应用文件。若 DSH 升级或重装，`app.asar` 会被覆盖，补丁消失，需重新打。
- 补丁以文本锚点定位宿主代码。上游结构变化后会拒绝执行（退出码 2），而不是猜测着改坏文件；届时需要重新验证锚点。
- 应用自带按条目记录的内容哈希，补丁会为被改动条目重算；不修改其余条目的哈希。
- 仅支持 Windows 构建（bridge 内部也按 `win32` 生效）。
- 若打补丁后无法启动：用 `patcher\patch.cmd --restore` 回滚，或重装 DSH。每次 `--apply` 都会生成带时间戳的备份，`--restore` 撤销的是最近一次。
- 补丁不会改动 DSH 的插件启用设置，也不修改其它安装位置的文件。

## 文件结构

```
dsh-whale-opening/
├─ package.json  cordis.patch.yml  index.js  client.js  LICENSE
├─ media/opening-4k-h264.mp4  media/first-frame.jpg
└─ patcher/
   ├─ patch.cmd                  Windows 入口（免装 Node）
   ├─ patch.mjs                  CLI：探测目录、检查、写入、回滚
   ├─ asar.mjs                   无依赖的 asar 读写
   ├─ transform.mjs              锚点式文本变换
   ├─ bridge.mjs                 注入主进程的启动桥
   └─ preload-single-opening.cjs 追加到 preload 的首帧遮罩
```

## 许可

MIT License，见 [LICENSE](LICENSE)。仅覆盖本仓库自有代码。
