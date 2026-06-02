# 截图与录屏放这里 · Media assets

主 README 的「🎬 Demo 预览」会引用本文件夹下的图片/动图。把你录好的文件按下面的**文件名**放进来，就会自动在 README 中显示。

| 文件名 | 内容 | 建议页面 |
|--------|------|----------|
| `home.png` | 主界面截图 | 首页 |
| `playground-learn.gif` | 网格游乐场「观看学习」全过程 | 游乐场 → 观看学习 |
| `qlearning-gridworld.gif` | Q 值热力图 + 箭头 + 小人到终点 | Q-Learning |
| `cliff-sarsa-vs-q.gif` | 悬崖行走两种走法对比 | SARSA / Q-Learning |
| `dueling-dqn.gif` | Q / V(s) / A(s,a) 三图并排 | Dueling DQN |
| `ppo-nav2d.gif` | 2D 连续导航轨迹 | PPO |
| `a2c-nav2d.gif` | 2D 连续导航轨迹 | A2C |

---

## 怎么录(macOS)

### 方法 A · Kap(推荐,直接导出 GIF)
1. 免费下载 [Kap](https://getkap.co/)(或 `brew install --cask kap`)。
2. 打开 Kap,框选浏览器里 demo 区域,点录制。
3. 跑一遍交互(比如点「观看学习」看策略收敛)。
4. 停止后选 **Export → GIF**,FPS 选 15–20,宽度压到 ~800px 控制体积。
5. 按上表命名,存到本文件夹。

### 方法 B · 系统自带(录成视频再转 GIF)
1. `Cmd + Shift + 5` → 录制选定区域 → 得到 `.mov`。
2. 转 GIF(需要 `brew install ffmpeg`):
   ```bash
   ffmpeg -i input.mov -vf "fps=15,scale=800:-1:flags=lanczos" -loop 0 output.gif
   ```

### 体积建议
- GIF 控制在 **每个 < 8MB**(README 加载快、GitHub 友好)。
- 太大就降 FPS / 缩宽度 / 截短时长。

---

## 想放短视频(MP4)而不是 GIF?
GitHub 的 Markdown **不能**直接 `<img>` 引用仓库里的 mp4。两种做法:
1. **拖拽上传**:在 GitHub 网页上编辑 README(或随便开个 Issue),把 `.mp4` 拖进编辑框,GitHub 会生成一个 `https://user-images.githubusercontent.com/...` 链接,粘到 README 里即可播放。
2. 仍然推荐 GIF —— 免托管、随仓库走、离线可见。
