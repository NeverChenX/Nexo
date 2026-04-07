# 推荐10 个让 Claude Code 火力全开的 CLI 神器

> 来源：[知乎 - 大模型爱好者社区](https://zhuanlan.zhihu.com/p/2024447023517115979)  
> 作者：大模型算法专家｜更多内容见公众号：机器学习社区  
> 收录时间：2026-04-07

---

这两天，我在捣鼓一件事。

给 Claude Code 造 CLI 工具。

学着学着就发现，这玩意儿，真的是未来。

过去半年，我试过不下 50 个 CLI 工具。有些装上就卸，有些用了一周就忘。但有 10 个，真的改变了我的工作流。

今天这篇文章，就是把这 10 个工具，连同安装命令、使用场景、避坑指南，全部分享给你。

每一个都附带一键安装命令。复制粘贴，就能用。

兄弟们，系好安全带。

---

## 1. CLI Anything —— 造 CLI 工具的 CLI 工具

第一个工具，有点离谱。

它叫 CLI Anything。

这是一个，造 CLI 工具的 CLI 工具。对，你没听错。元工具。

这东西来自 LightRAG 和 RAG Anything 的团队，这帮人在 AI 开源界，那可是大魔王级别的存在。

核心逻辑很简单：你指向任何一个开源项目，CLI Anything 就能自动给你生成一个 CLI 工具。只要是开源的，只要你想让 Claude Code 从终端控制它，这玩意儿就能帮你实现。

我用它给 Blender、OBS、Inkscape 这些没有 CLI 的工具，全都造了一套 CLI 接口。现在 Claude Code 可以直接控制这些软件。这才是真正的万物皆可 CLI。

而且安装超级简单。两步安装，一步执行。

```bash
pip install cli-anything
cli-anything init
```

但说实话，这工具的存在本身，就已经说明了一件事：CLI 工具的时代，真的来了。

**GitHub:** https://github.com/HKUDS/CLI-Anything

---

## 2. Notebook LM CLI —— 我每天都在用的神器

第二个工具，是我的心头好。

Notebook LM CLI。

这玩意儿，我是真的每天都在用。为什么？因为它解决了一个 Claude Code 最大的痛点——它不擅长处理视频。

但 Notebook LM 可以。

我只需要把 YouTube 链接扔给 Notebook LM，它就会自动帮我分析视频内容。而且这些 token，全都是 Google 的服务器在烧。不是我的。免费的。

然后，所有的分析结果，都会被带回 Claude Code。

不仅如此。Notebook LM 能做的所有交付物——播客、视频、幻灯片、信息图、测验、闪卡——Claude Code 现在也都能做了。而且是从终端直接控制。

每天早上，我会把要研究的 YouTube 视频链接批量扔给 Notebook LM。它会自动生成视频摘要、关键时间戳、播客音频、幻灯片、测验和闪卡。全自动，而且从终端直接控制。

当然，如果你懒得自己装，直接把 GitHub 链接扔给 Claude Code，它会自己装。真的，有手就行。

```bash
pip install notebooklm-py
```

**GitHub:** https://github.com/teng-lin/notebooklm-py

---

## 3. Stripe CLI —— 让钱的事情变简单

第三个工具，是关于钱的。

Stripe CLI。

如果你用过 Stripe 创建过产品，你就知道它的后台有多反人类。那个界面，简直是噩梦。点来点去，填来填去。头皮发麻。

但有了 Stripe CLI，这些痛苦全都消失了。

现在我创建产品、设置价格、管理订阅，全都在终端里完成。全自动。

而且 Claude Code 对 Stripe 的理解已经非常深了。你只需要说一句话："帮我创建一个月付 9.9 美元的订阅产品。"它就会自己去调 Stripe CLI。丝滑到爆炸。

```bash
# macOS
brew install stripe/stripe-cli/stripe
# Windows
scoop install stripe
```

**GitHub:** https://github.com/stripe/stripe-cli

---

## 4. FFmpeg —— 视频处理的瑞士军刀

第四个工具，是多媒体领域的大魔王。

FFmpeg。

这是一个视频、音频、字幕处理的工具集。强大到离谱。

压缩视频、提取音频、添加字幕、转换格式。你能想到的，FFmpeg 都能做。

比如说，我之前做网页设计的时候，想要一个键盘从完整到爆炸的滚动动画。我用 FFmpeg 把整个视频切成了单独的帧。然后直接用在网页上。

Claude Code 原生不擅长多媒体处理，但有了 FFmpeg，它就像开了挂。

而且 Claude Code 会自己写 FFmpeg 命令。你只需要告诉它你要什么效果。它会自己去查文档，自己去试错，自己去调参数。这才是真正的 AI 助手。

```bash
# macOS
brew install ffmpeg
# Linux
sudo apt install ffmpeg
```

**GitHub:** https://github.com/FFmpeg/FFmpeg

---

## 5. GitHub CLI —— 这个你必须得会

第五个工具，你肯定听过。

GitHub CLI。

如果你还没用上这个，那你真的落后了。

只要你写代码，只要你要推到 GitHub，就没有理由不用这个工具。提交、推送、分支管理、PR 创建——全都在终端里完成。不用再来回切标签页。不用再手动点来点去。

现在我所有的 Git 操作，全都通过 GitHub CLI。

而且 Claude Code 对 Git 和 GitHub 的理解已经非常深了。你只需要说一句话："帮我装一下 GitHub CLI。"它就会自动搞定。

唯一需要你做的，就是点个链接，登录一下 GitHub。就这么简单。

```bash
# macOS
brew install gh
# Windows
scoop install gh
```

**GitHub:** https://github.com/cli/cli

---

## 6. Vercel CLI —— 部署从未如此丝滑

第六个工具，是部署神器。

Vercel CLI。

我爱 Vercel，因为它有超级慷慨的免费额度。而且它和 GitHub 的集成，让 CI/CD 流程变得无比丝滑。

安装 Vercel CLI 也是秒级操作。然后你就可以在终端里，控制整个部署流程。不用再打开浏览器。不用再来回切换。

而且 Vercel 官方还提供了一堆 Skill，专门给 Claude Code 用。比如 Vercel Deploy Skill、Browser Automation Skill、UI Design Skill。这些 Skill，绝对值得你去看看。

```bash
npm i -g vercel
```

**GitHub:** https://github.com/vercel/vercel  
**Vercel Skills 合集：** https://github.com/vercel/ai-sdk-skills

---

## 7. Supabase CLI —— 后端的最佳拍档

第七个工具，是后端神器。

Supabase CLI。

我喜欢 Supabase，原因和 Vercel 一样——免费额度够大。而且它把数据库和身份验证，全都整合在一起。一个工具，搞定所有后端需求。

而且 Supabase 是开源的。它本来就是 Firebase 的开源替代品。

如果你想完全本地运行 Supabase，CLI 工具也能帮你做到。真的，这就是开源的魅力。

```bash
# macOS
brew install supabase/tap/supabase
# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**GitHub:** https://github.com/supabase/cli

---

## 8. Playwright CLI —— 浏览器自动化的王者

第八个工具，是浏览器自动化领域的王者。

Playwright CLI。

这玩意儿，能让 Claude Code 启动自己的 Chrome 实例，然后在网页上自动完成各种任务。抓取数据、填写表单、截图、录屏。全自动。

而且前面说过，Playwright 官方做过对比测试。CLI 工具 vs MCP 服务器。结果？CLI 更快，而且 token 消耗少了 90,000 个。这就是 CLI 和 MCP 的差距。

现在我测试 Web 应用，不用自己手动点了。让 Claude Code 自己启动 5 个 Chrome 标签页，从不同角度攻击表单。自动化测试，就该这么玩。

而且 Playwright 的功能，远不止表单测试这么简单。如果你真的想深挖浏览器自动化，这个工具的 GitHub 仓库值得你好好研究。

```bash
npm i -g playwright
playwright install
```

**GitHub:** https://github.com/microsoft/playwright-cli

---

## 9. LLMFit —— 找到最适合你的本地模型

第九个工具，有点特别。

LLMFit。

这是一个帮你匹配本地模型的工具。

如果你想在本地跑模型，但不知道该选哪个。Ollama 上有几百个模型，每个模型还有 9 个不同版本。选择困难症，直接爆炸。

LLMFit 解决的就是这个问题。你运行一下，它就会告诉你："嘿，基于你的硬件，这个模型最适合你。"简单、直接、有效。

省下了大量的试错时间。不用再一个个下载测试了。

```bash
pip install llmfit
llmfit scan
```

**GitHub:** https://github.com/AlexsJones/llmfit

---

## 10. GWS —— 控制整个 Google 全家桶

最后一个工具，是终极大杀器。

GWS (Google Workspace CLI)。

这个工具，能让 Claude Code 控制你整个 Google Workspace。邮件、文档、表格、日历——全部。这是真正的全面接管。

当然，这也带来了安全问题。你真的想让 Claude Code 访问你所有的邮件吗？

好消息是，GWS 提供了沙盒机制。你可以设置过滤器，限制 Claude Code 只能访问特定的文件夹或邮件。而且 Google Workspace 本身有 Armor 防护，专门用来防止提示词注入攻击。所以，并不是完全放飞。

但即便如此，这个工具的技能库，也是多到离谱。我是说，真的多。

所以我的建议是：把整个 GitHub 仓库克隆下来，然后让 Claude Code 帮你分析。问它："基于我的需求，我应该装哪些 Skill？"让 AI 帮你选 AI 工具。这才是正确的打开方式。

```bash
npm install -g @googleworkspace/cli
gws auth login
```

**GitHub:** https://github.com/googleworkspace/cli

---

## 别贪多，先装你需要的

看到这里，可能有人已经热血沸腾，准备把所有工具都装上。

慢着。

CLI 工具确实很强，但它不是万能的。

第一，别贪多。不是所有工具都适合你。先装你真正需要的。

我自己常用的，其实就 5 个：Notebook LM CLI、GitHub CLI、Vercel CLI、Playwright CLI、FFmpeg。其他的，都是按需装。

第二，先从简单的开始。如果你是新手，先从 GitHub CLI 和 Vercel CLI 开始。这两个最简单，也最实用。等熟悉了，再往上加。

第三，学会看文档。每个工具的 GitHub 仓库，都有详细的文档。遇到问题，先看文档。实在不行，把文档扔给 Claude Code，让它帮你解决。

---

## 总结清单

| 工具 | 用途 | 安装命令 |
|------|------|----------|
| CLI Anything | 造 CLI 工具的元工具 | `pip install cli-anything` |
| Notebook LM CLI | 视频分析、播客生成 | `pip install notebooklm-py` |
| Stripe CLI | 支付、订阅管理 | `brew install stripe/stripe-cli/stripe` |
| FFmpeg | 视频/音频处理 | `brew install ffmpeg` |
| GitHub CLI | Git 操作、PR 管理 | `brew install gh` |
| Vercel CLI | 部署、CI/CD | `npm i -g vercel` |
| Supabase CLI | 数据库、后端服务 | `brew install supabase/tap/supabase` |
| Playwright CLI | 浏览器自动化 | `npm i -g playwright` |
| LLMFit | 本地模型匹配 | `pip install llmfit` |
| GWS | Google Workspace 控制 | `npm install -g @googleworkspace/cli` |

---

> 💡 **提示**：这篇文章提到的工具都可以让 Claude Code 直接帮你安装。把 GitHub 链接扔给它，说"帮我装一下这个"，它会自动搞定。
