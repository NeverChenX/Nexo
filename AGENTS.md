# Never Wiki — Agent 长期记忆

## 前端抖动 / CLS 排查流程

### 症状
阅读页 (`/read/...`) 首次访问或刷新时，正文区域出现上下抖动或闪烁。

### 排查步骤（按优先级）

1. **检查数据加载状态的初始值**
   - 若 `useState` 的初始 `loading` 为 `false`，组件第一帧会渲染空状态/占位文案，随后 `useEffect` 触发 fetch 瞬间切到骨架屏 → 内容。
   - **修复**：根据 `ids` 是否存在，在 `useState` 的 initializer 中直接设为 `true`。
   - 文件：`app/read/_reader/hooks/useArticle.ts`

2. **检查图片是否有尺寸占位**
   - `<img>` 没有 `width/height` 或 `aspect-ratio` 时，浏览器在加载前无法预留空间，图片加载完成后高度从 0 扩展，导致下方内容被下推（CLS）。
   - **修复**：
     - 用 `<div>` 包裹 `<img>`，设置 `minHeight` 和 `background` 作为加载占位。
     - 使用 `loading="lazy" decoding="async"` 优化加载性能。
     - 在 `useEffect` 中检查 `imgRef.current.complete`，若图片已被缓存则立即标记 `loaded`，避免占位闪烁。
   - 文件：`components/reader/DarkImageLightbox.tsx`

3. **检查 hydration mismatch 导致的样式跳变**
   - 若组件从 `localStorage` 读取主题/字号等偏好，SSR 输出使用默认值，客户端 hydration 后 `useEffect` 立即切换为真实值。
   - 如果差异大（如字号从 17px → 20px），会触发全页面重排。
   - **短期修复**：确保 SSR 初始状态与客户端首次渲染一致；变化时使用 CSS `transition` 平滑过渡。
   - **长期修复**：在 `<head>` 注入 inline script，在 React hydration 前读取 localStorage 并预先设置 class/style，使 hydration 时 DOM 已匹配真实偏好。

4. **检查异步渲染组件（Mermaid、KaTeX 等）**
   - `DarkMermaid` 在 `useEffect` 中动态 import 并渲染 SVG，初始为空 div，渲染完成后高度突变。
   - `rehype-katex` 依赖的 CSS 若未在 `<head>` 预加载，公式会先以无样式文本渲染，再跳变为正确高度。
   - **修复**：为异步组件预留固定高度或使用 `aspect-ratio`；确保关键 CSS 已打包进初始 CSS chunk 并在 `<head>` 引用。

5. **检查滚动恢复与图片加载的时序冲突**
   - `useReaderProgress` 在 `articleReady` 后通过 `requestAnimationFrame` + `scrollTo` 恢复上次阅读位置。
   - 若此时图片尚未加载，内容高度会在滚动恢复后继续增长，导致用户视角的内容位置发生偏移。
   - **修复**：优先解决图片尺寸占位问题；必要时在图片全部加载完成后再执行精确滚动恢复。

### 本次修复记录
- `app/read/_reader/hooks/useArticle.ts`：将 `loading` 初始值从 `false` 改为 `() => !!ids && ids.length > 0`，消除"请选择一篇文章"的闪现。
- `components/reader/DarkImageLightbox.tsx`：添加 `loaded` 状态、`minHeight` 占位、`opacity` 淡入过渡，并检测缓存图片避免重复闪烁。
- `app/read/_reader/hooks/useReaderProgress.ts`：修复 scroll 恢复逻辑。原代码在 `scrollEl` 尚未挂载时就将 `resumedRef.current` 设为 `true`，导致后续 `scrollEl` 可用后永远跳过恢复。改为仅在 `prevEntry` 不存在时才标记完成，`scrollEl` 为 null 时仅直接 return 等待下一次 effect。
- `app/read/_reader/reader.module.css`：给 `.shell` 的 `transition` 追加 `font-size 120ms ease, line-height 120ms ease`，使阅读偏好（字号/行高）在 hydration 后变化时平滑过渡，减少抖动感知。
- `app/layout.tsx`：在 `<head>` 注入 pre-hydration inline script，提前将 `localStorage` 中的阅读偏好读取到 `window.__RD_PREFS__`，为后续彻底消除 hydration mismatch 做铺垫。
- `lib/reader/prefs.ts`：`loadPrefs()` 优先读取 `window.__RD_PREFS__`（若存在），避免在 `useEffect` 中重复访问 `localStorage`。
