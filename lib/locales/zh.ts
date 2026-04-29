const zh: Record<string, string> = {
  // 通用
  'common.cancel': '取消',
  'common.confirm': '确定',
  'common.delete': '删除',
  'common.rename': '重命名',
  'common.create': '创建',
  'common.close': '关闭',
  'common.loading': '加载中...',
  'common.loadingEllipsis': '加载中…',
  'common.save': '保存',
  'common.search': '搜索',
  'common.noResults': '无结果',
  'common.error': '错误',
  'common.success': '成功',
  'common.tip': '提示',
  'common.input': '输入',
  'common.backHome': '返回首页',
  'common.retry': '重试',
  'common.copied': '已复制',

  // 时间（相对）
  'time.justNow': '刚刚',
  'time.minutesAgo': '{n} 分钟前',
  'time.hoursAgo': '{n} 小时前',
  'time.daysAgo': '{n} 天前',
  'time.monthsAgo': '{n} 个月前',
  'time.yearsAgo': '{n} 年前',

  // 编辑器页面
  'editor.noDocSelected': '未选择文档',
  'editor.saving': '保存中...',
  'editor.unsaved': '未保存',
  'editor.saved': '已保存',
  'editor.selectOrCreate': '选择或创建一篇文档开始编辑',
  'editor.selectFromSidebar': '从左侧目录选择，或右键新建',
  'editor.share': '分享',
  'editor.delete': '删除',
  'editor.resizeSidebar': '调整左侧菜单宽度',
  'editor.confirmDelete': '确认删除',
  'editor.confirmDeleteMsg': '确定要删除 "{name}" 吗？',
  'editor.confirmDeleteFolderMsg': '确定要删除 "{name}" 吗？子页面也会一并删除。',
  'editor.loadFailed': '加载文章失败',
  'editor.deleteFailed': '删除失败',
  'editor.createFailed': '创建文章失败',

  // 阅读页面
  'read.selectArticle': '选择一篇文章开始阅读',
  'read.selectFromSidebar': '从左侧目录中选择',
  'read.copyMarkdown': '复制 Markdown',
  'read.collapseSidebar': '折叠侧栏',
  'read.expandSidebar': '展开侧栏',
  'read.catalog': '目录',
  'read.networkError': '网络错误，请重试',
  'read.loadFailed': '加载失败',
  'read.imagePreview': '图片预览',

  // 目录
  'toc.title': '目录',

  // 树形菜单
  'tree.catalog': '目录',
  'tree.newSubPage': '新建子页面',
  'tree.newSubFolder': '新建子文件夹',
  'tree.newMenu': '新建',
  'tree.newRootPage': '新建页面',
  'tree.newRootFolder': '新建文件夹',
  'tree.defaultNewFolderName': '新建文件夹',
  'tree.renameTo': '重命名为:',
  'tree.moveTo': '移动到:',
  'tree.deleteConfirm': '确定删除 "{name}" 吗？',
  'tree.deleteFolderConfirm': '确定删除 "{name}" 吗？子页面也会一并删除。',
  'tree.emptyTree': '暂无文档',
  'tree.renameFailed': '重命名失败',
  'tree.deleteFailed': '删除失败',
  'tree.moveFailed': '移动失败',
  'tree.loadFailed': '加载文档树失败',
  'tree.createFolderFailed': '创建文件夹失败',

  // 创建文档弹窗
  'createModal.title': '新建文档',
  'createModal.location': '位置：{path}',
  'createModal.placeholder': '文档名称',
  'createModal.discardConfirm': '已输入的内容将会丢失，确定要关闭吗？',

  // 分享弹窗
  'share.shareArticle': '分享文章',
  'share.shareFolder': '分享文件夹',
  'share.description': '生成一个永久的分享链接，允许其他人查看内容',
  'share.generate': '生成分享链接',
  'share.generating': '生成中...',
  'share.linkLabel': '分享链接',
  'share.generateNew': '生成新链接',
  'share.generateFailed': '生成失败',
  'share.copyLink': '复制链接',
  'share.copied': '已复制',

  // BlockNote 编辑器
  'bn.newSubPage': '新建子页面',
  'bn.newSubPageDesc': '创建一个子页面',
  'bn.pageGroup': '页面',
  'bn.unnamedPage': '未命名页面',
  'bn.defaultNewPageName': '新页面',
  'bn.uploadFailed': '上传失败',
  'bn.parseFailed': '内容解析失败',

  // AI 解释
  'ai.title': '✦ AI 解释',
  'ai.explaining': '解释中...',
  'ai.explainFailed': '解释失败',
  'ai.requestFailed': '请求失败',
  'ai.explain': 'AI 解释',

  // AI 知识问答
  'aiAsk.title': 'AI 知识问答',
  'aiAsk.welcome': '向你的知识库提问',
  'aiAsk.hint': '我会搜索你的所有文档，找到答案并引用来源',
  'aiAsk.placeholder': '输入你的问题...',
  'aiAsk.thinking': '正在搜索和思考...',
  'aiAsk.you': '你',
  'aiAsk.ai': 'AI 助手',
  'aiAsk.requestFailed': '请求失败，请重试',

  // 颜色（文字 + 背景）
  'color.title': '颜色',
  'color.text': '文字颜色',
  'color.background': '背景颜色',
  'color.name.default': '默认',
  'color.name.gray': '灰色',
  'color.name.brown': '棕色',
  'color.name.red': '红色',
  'color.name.orange': '橙色',
  'color.name.yellow': '黄色',
  'color.name.green': '绿色',
  'color.name.blue': '蓝色',
  'color.name.purple': '紫色',
  'color.name.pink': '粉色',

  // 批注高亮
  'highlight.title': '高亮',
  'highlight.yellow': '黄色',
  'highlight.green': '绿色',
  'highlight.blue': '蓝色',
  'highlight.pink': '粉色',
  'highlight.red': '红色',
  'highlight.clear': '清除高亮',
  'highlight.annotate': '添加批注',

  // AI 写作工具箱
  'aiWrite.title': 'AI 写作助手',
  'aiWrite.summarize': '总结',
  'aiWrite.expand': '扩写',
  'aiWrite.rewrite': '改写',
  'aiWrite.continue': '续写',
  'aiWrite.fix_grammar': '修正语法',
  'aiWrite.translate_zh': '翻译为中文',
  'aiWrite.translate_en': '翻译为英文',
  'aiWrite.simplify': '简化',
  'aiWrite.formal': '正式化',
  'aiWrite.bullet_points': '转为要点',
  'aiWrite.processing': '处理中...',
  'aiWrite.failed': 'AI 处理失败',
  'aiWrite.requestFailed': '请求失败',
  'aiWrite.replace': '替换原文',
  'aiWrite.insertBelow': '插入下方',
  'aiWrite.copy': '复制',
  'aiWrite.back': '返回',

  // AI 自定义提问（针对选中内容自由输入 prompt）
  'aiCustom.title': 'AI 自定义提问',
  'aiCustom.placeholder': '输入你的要求，例如：用数学模型解释这个内容 / 列出三个反例 / 改写成给小学生看的版本',
  'aiCustom.submit': '提问',
  'aiCustom.submitHint': '⌘+Enter 提交',
  'aiCustom.thinking': 'AI 思考中…',
  'aiCustom.failed': 'AI 处理失败',
  'aiCustom.requestFailed': '请求失败',
  'aiCustom.yourQuestion': '你的问题',
  'aiCustom.insertBelow': '插入到下一行',
  'aiCustom.copy': '复制',
  'aiCustom.reset': '重新提问',

  // 使用者备注
  'userNote.insert': '插入备注',

  // 搜索（Phase 2）
  'search.placeholder': '搜索文档...',
  'search.noResults': '未找到相关文档',

  // 命令面板（Phase 3）
  'cmd.placeholder': '搜索文档或输入命令...',
  'cmd.recentDocs': '最近文档',
  'cmd.actions': '操作',
  'cmd.newDoc': '新建文档',
  'cmd.goToRead': '进入阅读模式',

  // 最近文档（Phase 4）
  'recent.title': '最近访问',
  'recent.empty': '暂无最近文档',

  // 文档统计（Phase 6）
  'stats.words': '{count} 字',
  'stats.readTime': '约 {min} 分钟',

  // 文档权限
  'perm.title': '权限',
  'perm.editable': '可编辑',
  'perm.readonly': '只读',
  'perm.private': '私密',
  'perm.readonlyNotice': '此文档为只读模式，无法编辑',
  'perm.privateNotice': '此文档为私密文档',
  'perm.changeFailed': '权限修改失败',

  // 页面图标与封面
  'pageIcon.addIcon': '添加图标',
  'pageIcon.addCover': '添加封面',
  'pageIcon.selectEmoji': '选择图标',
  'pageIcon.removeIcon': '移除',
  'pageIcon.coverUrlPlaceholder': '输入封面图片 URL...',

  // 文档属性面板
  'props.title': '属性',
  'props.addProperty': '添加属性',
  'props.keyPlaceholder': '属性名称...',
  'props.valuePlaceholder': '空',
  'props.status': '状态',
  'props.priority': '优先级',
  'props.due': '截止日期',
  'props.author': '作者',
  'props.category': '分类',
  'props.invalidKey': '名称只能用字母/数字/_/-，且以字母或下划线开头',
  'props.keyExists': '该属性已存在',

  // 文档统计栏
  'statsBar.words': '{count} 字',
  'statsBar.chars': '{count} 字符',
  'statsBar.charsNoSpace': '{count} 字符(不含空格)',
  'statsBar.paragraphs': '{count} 段',
  'statsBar.readTime': '阅读约 {min} 分钟',

  // 标签（Phase 8）
  'tags.add': '添加标签',
  'tags.placeholder': '输入标签名...',

  // 反向链接（Phase 9）
  'backlinks.title': '反向链接',
  'backlinks.count': '{count} 篇文档链接到此页面',
  'backlinks.none': '暂无反向链接',

  // 模板（Phase 10）
  'template.select': '选择模板',
  'template.blank': '空白文档',
  'template.meetingNotes': '会议纪要',
  'template.techSpec': '技术方案',
  'template.readingNotes': '读书笔记',

  // 导出（Phase 11）
  'export.title': '导出',
  'export.markdown': '导出为 Markdown',
  'export.html': '导出为 HTML',
  'export.pdfStyled': '导出排版 PDF',
  'export.pdf': '打印为 PDF',

  // 回收站（Phase 12）
  'trash.title': '回收站',
  'trash.empty': '回收站为空',
  'trash.restore': '恢复',
  'trash.deletePermanently': '永久删除',
  'trash.emptyTrash': '清空回收站',
  'trash.deleteTime': '删除于 {time}',
  'trash.confirmEmpty': '确定要清空回收站吗？此操作不可恢复。',
  'trash.confirmEmptyCount': '确定要永久删除 {count} 项吗？此操作不可恢复。',

  // 导入（Phase 13）
  'import.title': '导入',
  'import.selectFiles': '选择 Markdown 文件',
  'import.dragHint': '拖拽文件到此处，或点击选择',
  'import.importing': '导入中...',
  'import.failed': '导入失败',
  'import.networkError': '网络错误，请重试',

  // 附件（Phase 14）
  'attachment.upload': '上传附件',
  'attachment.download': '下载',

  // 评论（Phase 15）
  'comments.title': '备注',
  'comments.add': '添加备注',
  'comments.placeholder': '输入备注内容...',
  'comments.empty': '暂无备注',

  // 快捷键（Phase 16）
  'shortcuts.title': '快捷键',
  'shortcuts.save': '保存',
  'shortcuts.search': '搜索 / 命令面板',
  'shortcuts.slashMenu': '插入块',
  'shortcuts.help': '快捷键帮助',
  'shortcuts.close': '关闭弹窗 / 退出',
  'shortcuts.navUpDown': '上下选择',
  'shortcuts.confirm': '确认选择',
  'shortcuts.groupGlobal': '全局',
  'shortcuts.groupEditor': '编辑器',
  'shortcuts.groupNav': '导航',

  // 首页
  'home.welcome': '欢迎回来',
  'home.subtitle': '从这里快速访问你的知识库',
  'home.newDoc': '新建文档',
  'home.totalDocs': '文档总数',
  'home.totalWords': '总字数',
  'home.totalTags': '标签数',
  'home.totalFolders': '文件夹数',
  'home.recentVisited': '最近访问',
  'home.recentUpdated': '最近更新',
  'home.tagCloud': '标签',
  'home.words': '字',
  'home.homepage': '首页',
  'home.activity': '写作活跃度（近 30 天）',
  'home.less': '少',
  'home.more': '多',
  'home.favorites': '收藏文档',
  'home.favoritesEmpty': '暂无收藏，点击文档右上角 ☆ 收藏',
  'home.randomDoc': '随便看看',

  // 收藏
  'favorites.title': '收藏',
  'favorites.add': '收藏',
  'favorites.remove': '取消收藏',

  // 知识图谱
  'graph.title': '知识图谱',
  'graph.toReadMode': '阅读模式',
  'graph.doc': '文档',
  'graph.folder': '文件夹',
  'graph.nodeCount': '{count} 个节点',
  'graph.edgeCount': '{count} 条连接',

  // 收藏分组
  'favGroup.ungrouped': '未分组',
  'favGroup.setGroup': '设置分组',
  'favGroup.newGroup': '新建分组...',
  'favGroup.groupPlaceholder': '分组名称...',
  'favGroup.removeGroup': '移出分组',

  // 知识图谱增强
  'graph.filterByTag': '按标签过滤',
  'graph.allTags': '全部',

  // 语言
  'locale.zh': '中文',
  'locale.en': 'English',
  'locale.switch': '语言',

  // 设置
  'settings.title': '设置',
  'settings.tab.llm': 'AI 模型',
  'settings.saved': '已保存',
  'settings.llm.desc': '所有 AI 功能（写作、问答、解释、分类）都会使用此配置。密钥仅保存在服务端。',
  'settings.llm.provider': '服务商',
  'settings.llm.baseUrl': 'Base URL',
  'settings.llm.apiKey': 'API Key',
  'settings.llm.apiKey.envHint': '当前来自 .env.local 的 ARK_API_KEY；在此处修改并保存会改写到 wiki-data/_config/llm.json 并覆盖 env。',
  'settings.llm.apiKey.fileHint': '保存在 wiki-data/_config/llm.json（仅本机可读）。',
  'settings.llm.model': '模型 ID',
  'settings.llm.temperature': '温度（Temperature）',
  'settings.llm.maxTokens': '最大 Token',
  'settings.llm.timeoutMs': '超时（毫秒）',
  'settings.llm.thinking': '深度思考',
  'settings.llm.thinking.hint': 'seed-1-6 及以上模型建议选 disabled（直答），否则短回答会被思考 token 吃掉。',
  'settings.llm.test': '测试连通性',
  'settings.llm.testing': '正在测试…',
  'settings.llm.testOk': '连通正常（{ms} ms）',
  'settings.llm.reply': '回复',
  'settings.ui.section': '界面',
  'settings.ui.aiClassifyHint': 'AI 分类建议浮条',
  'settings.ui.aiClassifyHint.desc': '编辑器右下角自动推荐目录和标签。默认关闭，开启后超过 300 字才会触发。',

  // BlockNote 块菜单（Notion 风格 SideMenu）
  'bn.menu.searchPlaceholder': '搜索动作…',
  'bn.menu.turnInto': '转换为…',
  'bn.menu.color': '颜色…',
  'bn.menu.copyMarkdown': '复制为 Markdown',
  'bn.menu.copyText': '复制为纯文本',
  'bn.menu.copyLink': '复制块链接',
  'bn.menu.toSubpage': '提取为子页面',
  'bn.menu.askAi': 'Ask AI · 解释这一段',
  'bn.menu.delete': '删除',
  'bn.menu.deleteShortcut': 'Del',
  'bn.menu.back': '返回',
  'bn.menu.noResults': '未找到匹配项',
  'bn.menu.lastEdited': '修改于 {time}',
  'bn.menu.dragHandle': '拖动 / 打开菜单',
  'bn.menu.addBlock': '插入块（点击）/ AI（Alt+点击）',
  'bn.menu.linkCopied': '块链接已复制',
  'bn.menu.mdCopied': 'Markdown 已复制',
  'bn.menu.textCopied': '纯文本已复制',
  'bn.menu.subpageCreated': '已提取为子页面',
  'bn.menu.subpageFailed': '提取子页面失败',

  // 转换为（Turn into）子菜单
  'bn.turn.title': '转换为',
  'bn.turn.paragraph': '正文段落',
  'bn.turn.h1': '一级标题',
  'bn.turn.h2': '二级标题',
  'bn.turn.h3': '三级标题',
  'bn.turn.bulletList': '项目列表',
  'bn.turn.numberedList': '编号列表',
  'bn.turn.checkList': '勾选清单',
  'bn.turn.toggleHeading': '可折叠标题',
  'bn.turn.quote': '引用块',
  'bn.turn.code': '代码块',

  // 颜色子菜单
  'bn.color.text': '文字颜色',
  'bn.color.background': '背景颜色',
};

export default zh;
