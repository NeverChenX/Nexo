#!/bin/bash
# 每日凌晨3点自动搜集全球深度投资研究文章
# 系统级 crontab 驱动，无需 Claude Code 会话保持

WIKI_DIR="/home/Neverchen/project/never_wiki"
LOG_FILE="$WIKI_DIR/scripts/cron.log"
TODAY=$(date +%Y-%m-%d)
OUTPUT_DIR="$WIKI_DIR/wiki-data/投资文章/$TODAY"
PROMPT_FILE="/tmp/investment_research_prompt_$TODAY.txt"

echo "[$(date)] 开始执行每日深度投资研究搜集" >> "$LOG_FILE"

mkdir -p "$OUTPUT_DIR"

# 将 prompt 写入临时文件，避免超长参数问题
cat > "$PROMPT_FILE" << ENDOFPROMPT
你是一个专业投资研究助手。今天是 $TODAY，请执行深度投资研究收集任务。

**任务要求**：搜索过去24小时内发布的真正深度内容，严格过滤泛泛而谈的新闻资讯。

**执行步骤**：

依次用 WebSearch 工具搜索以下内容（每条都要搜）：
1. "AQR capital management research 2026"
2. "Howard Marks Oaktree memo 2026"
3. "GMO Jeremy Grantham quarterly 2026"
4. "Hussman weekly market comment 2026"
5. "BIS working paper financial markets 2026"
6. "Bridgewater Ray Dalio research 2026"
7. "deep value investing white paper analysis 2026"
8. "global macro institutional research report 2026"
9. "tariff trade war investment analysis 2026"
10. "Federal Reserve research paper markets 2026"

**筛选标准**（只保留符合所有条件的文章）：
- 必须来自：顶级资管机构研究部、知名基金经理、学术机构、央行/BIS/NBER
- 必须有：具体数据支撑、逻辑论证、独特分析视角
- 排除：普通新闻、资讯摘要、标题党

搜索完毕后，选出5-8篇最有深度的文章，用 Write 工具写入以下路径（必须使用完整绝对路径）：
$OUTPUT_DIR/全球深度投资研究精选.md

文件内容格式如下（严格按此格式输出，每个区块之间必须有空行，绝对不允许把不同内容混在同一行）：

# 📚 全球深度投资研究精选

**日期**：$TODAY

**搜集范围**：过去24小时

**生成时间**：$(date)

---

## 📌 今日总览

[用2-3句话说清楚今天整体在讲什么大背景、主要矛盾是什么。给完全不懂金融的人也能看懂。]

---

## 📰 精选文章

---

### 文章一：[文章标题]

| 字段 | 内容 |
|------|------|
| 来源 | [机构/作者] |
| 发布时间 | [日期] |
| 深度评级 | ⭐⭐⭐⭐⭐ |
| 原文链接 | [URL] |

<br>

#### 💡 一句话核心

> [用1-2句大白话说清楚这篇文章到底想表达什么，200字以内。不用专业术语，说清楚"作者认为发生了什么、为什么重要"。]

<br>

#### 🔍 核心观点解读

**观点一：[5-10字标题]**

[结论是什么。为什么会这样。用一个生活中的类比帮助理解。3-5句话，每句单独成行。]

<br>

**观点二：[5-10字标题]**

[同上格式]

<br>

**观点三：[5-10字标题]**

[同上格式]

<br>

#### 📈 对投资的实际意义

[直接说对买股票/配资产有什么具体参考价值。说具体，比如"现在不适合重仓美股成长股"，不说"需要关注风险"这种废话。]

---

[按以上格式依次列出5-8篇，每篇之间用 --- 分隔，文章编号依次递增：文章一、文章二……]

---

## 🌍 今日宏观大背景

[150字以内，大白话说清楚现在市场整体处于什么状态，帮助理解上面这些文章为什么在这个时间点特别重要。]

---

## 🔭 明日值得关注

- **[事件或指标1]**：[一句话说明为什么值得关注]

- **[事件或指标2]**：[一句话说明为什么值得关注]

- **[事件或指标3]**：[一句话说明为什么值得关注]

**语言要求**：所有输出内容必须使用中文，包括文章标题、来源、观点解读、宏观背景等全部内容，不得出现英文段落或英文标题。

立即开始执行，不要犹豫。先搜索，再整理，最后写文件。
ENDOFPROMPT

# 用管道传入 prompt，比 -p 参数更稳定
/home/Neverchen/.npm-global/bin/claude \
  --model claude-sonnet-4-6 \
  --dangerously-skip-permissions \
  -p "$(cat $PROMPT_FILE)" \
  >> "$LOG_FILE" 2>&1

RESULT=$?
rm -f "$PROMPT_FILE"

if [ -f "$OUTPUT_DIR/全球深度投资研究精选.md" ]; then
    echo "[$(date)] 执行成功，文件已生成：$OUTPUT_DIR/全球深度投资研究精选.md" >> "$LOG_FILE"
else
    echo "[$(date)] 警告：执行完成但未找到输出文件，退出码=$RESULT" >> "$LOG_FILE"
fi
