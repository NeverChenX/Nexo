/**
 * 全局 z-index 层级表。所有浮层用这里的常量，禁止自定义魔法数字。
 *
 * 层级约束：POPOVER < FLOATING_PANEL < MODAL < MODAL_TOP < LIGHTBOX
 * 这样新弹出的始终能盖住旧的；Lightbox 一定最上。
 */
export const Z = {
  BASE: 1,
  STICKY: 30,
  TOOLTIP: 50,
  POPOVER: 100,            // 下拉菜单、右键菜单、属性色板、breadcrumb dropdown
  FLOATING_PANEL: 150,     // AI 解释 / AI 写作等常驻浮动面板
  MODAL: 200,              // 标准 Dialog（创建文档、删除确认、分享、导入、回收站）
  MODAL_TOP: 300,          // 搜索、快捷键帮助、嵌套 modal
  LIGHTBOX: 400,           // 图片全屏预览（最上）
} as const;
