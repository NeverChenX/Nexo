const en: Record<string, string> = {
  // Common
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.rename': 'Rename',
  'common.create': 'Create',
  'common.close': 'Close',
  'common.loading': 'Loading...',
  'common.loadingEllipsis': 'Loading…',
  'common.save': 'Save',
  'common.search': 'Search',
  'common.noResults': 'No results',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.tip': 'Tip',
  'common.input': 'Input',
  'common.backHome': 'Back to Home',
  'common.retry': 'Retry',
  'common.copied': 'Copied',

  // Relative time
  'time.justNow': 'just now',
  'time.minutesAgo': '{n} min ago',
  'time.hoursAgo': '{n} h ago',
  'time.daysAgo': '{n} d ago',
  'time.monthsAgo': '{n} mo ago',
  'time.yearsAgo': '{n} y ago',

  // Editor page
  'editor.noDocSelected': 'No document selected',
  'editor.saving': 'Saving...',
  'editor.unsaved': 'Unsaved',
  'editor.saved': 'Saved',
  'editor.selectOrCreate': 'Select or create a document to start editing',
  'editor.selectFromSidebar': 'Choose from the sidebar, or right-click to create',
  'editor.share': 'Share',
  'editor.delete': 'Delete',
  'editor.resizeSidebar': 'Resize sidebar',
  'editor.confirmDelete': 'Confirm Delete',
  'editor.confirmDeleteMsg': 'Are you sure you want to delete "{name}"?',
  'editor.confirmDeleteFolderMsg': 'Are you sure you want to delete "{name}"? All sub-pages will be deleted too.',
  'editor.loadFailed': 'Failed to load article',
  'editor.deleteFailed': 'Failed to delete',
  'editor.createFailed': 'Failed to create article',

  // TOC
  'toc.title': 'Contents',

  // Tree menu
  'tree.catalog': 'Catalog',
  'tree.newSubPage': 'New Sub Page',
  'tree.newSubFolder': 'New Sub Folder',
  'tree.newMenu': 'New',
  'tree.newRootPage': 'New Page',
  'tree.newRootFolder': 'New Folder',
  'tree.defaultNewFolderName': 'New Folder',
  'tree.renameTo': 'Rename to:',
  'tree.moveTo': 'Move to:',
  'tree.deleteConfirm': 'Are you sure you want to delete "{name}"?',
  'tree.deleteFolderConfirm': 'Are you sure you want to delete "{name}"? All sub-pages will be deleted too.',
  'tree.emptyTree': 'No documents yet',
  'tree.renameFailed': 'Rename failed',
  'tree.deleteFailed': 'Delete failed',
  'tree.moveFailed': 'Move failed',
  'tree.loadFailed': 'Failed to load document tree',
  'tree.createFolderFailed': 'Failed to create folder',

  // Create modal
  'createModal.title': 'New Document',
  'createModal.location': 'Location: {path}',
  'createModal.placeholder': 'Document name',
  'createModal.discardConfirm': 'You have unsaved input. Discard and close?',

  // Share modal
  'share.shareArticle': 'Share Article',
  'share.shareFolder': 'Share Folder',
  'share.description': 'Generate a permanent share link for others to view',
  'share.generate': 'Generate Share Link',
  'share.generating': 'Generating...',
  'share.linkLabel': 'Share Link',
  'share.generateNew': 'Generate New Link',
  'share.generateFailed': 'Generation failed',
  'share.copyLink': 'Copy link',
  'share.copied': 'Copied',

  // BlockNote editor
  'bn.newSubPage': 'Page',
  'bn.newSubPageDesc': 'Create a new page',
  'bn.pageGroup': 'Page',
  'bn.unnamedPage': 'Unnamed Page',
  'bn.defaultNewPageName': 'Untitled',
  'bn.uploadFailed': 'Upload failed',
  'bn.parseFailed': 'Failed to parse content',

  // AI explain
  'ai.title': '✦ AI Explain',
  'ai.explaining': 'Explaining...',
  'ai.explainFailed': 'Explanation failed',
  'ai.requestFailed': 'Request failed',
  'ai.explain': 'AI Explain',

  // AI knowledge Q&A
  'aiAsk.title': 'AI Knowledge Q&A',
  'aiAsk.welcome': 'Ask your knowledge base',
  'aiAsk.hint': 'I will search all your documents, find answers and cite sources',
  'aiAsk.placeholder': 'Enter your question...',
  'aiAsk.thinking': 'Searching and thinking...',
  'aiAsk.you': 'You',
  'aiAsk.ai': 'AI Assistant',
  'aiAsk.requestFailed': 'Request failed, please retry',

  // Color (text + background)
  'color.title': 'Color',
  'color.text': 'Text color',
  'color.background': 'Background color',
  'color.name.default': 'Default',
  'color.name.gray': 'Gray',
  'color.name.brown': 'Brown',
  'color.name.red': 'Red',
  'color.name.orange': 'Orange',
  'color.name.yellow': 'Yellow',
  'color.name.green': 'Green',
  'color.name.blue': 'Blue',
  'color.name.purple': 'Purple',
  'color.name.pink': 'Pink',

  // Highlight & annotations
  'highlight.title': 'Highlight',
  'highlight.yellow': 'Yellow',
  'highlight.green': 'Green',
  'highlight.blue': 'Blue',
  'highlight.pink': 'Pink',
  'highlight.red': 'Red',
  'highlight.clear': 'Clear highlight',
  'highlight.annotate': 'Add annotation',

  // AI writing toolbox
  'aiWrite.title': 'AI Writing Assistant',
  'aiWrite.summarize': 'Summarize',
  'aiWrite.expand': 'Expand',
  'aiWrite.rewrite': 'Rewrite',
  'aiWrite.continue': 'Continue',
  'aiWrite.fix_grammar': 'Fix Grammar',
  'aiWrite.translate_zh': 'Translate to Chinese',
  'aiWrite.translate_en': 'Translate to English',
  'aiWrite.simplify': 'Simplify',
  'aiWrite.formal': 'Make Formal',
  'aiWrite.bullet_points': 'To Bullet Points',
  'aiWrite.processing': 'Processing...',
  'aiWrite.failed': 'AI processing failed',
  'aiWrite.requestFailed': 'Request failed',
  'aiWrite.replace': 'Replace',
  'aiWrite.insertBelow': 'Insert Below',
  'aiWrite.copy': 'Copy',
  'aiWrite.back': 'Back',

  // AI custom ask (free-form prompt over selection)
  'aiCustom.title': 'AI custom ask',
  'aiCustom.placeholder': 'Describe what you want, e.g. "Explain this with a math model" / "Give 3 counter-examples" / "Rewrite for a 10-year-old"',
  'aiCustom.submit': 'Ask',
  'aiCustom.submitHint': '⌘+Enter to submit',
  'aiCustom.thinking': 'Thinking…',
  'aiCustom.failed': 'AI request failed',
  'aiCustom.requestFailed': 'Request failed',
  'aiCustom.yourQuestion': 'Your question',
  'aiCustom.insertBelow': 'Insert below',
  'aiCustom.copy': 'Copy',
  'aiCustom.reset': 'Ask again',

  // User note
  'userNote.insert': 'Insert note',

  // Search (Phase 2)
  'search.placeholder': 'Search documents...',
  'search.noResults': 'No documents found',

  // Command palette (Phase 3)
  'cmd.placeholder': 'Search docs or type a command...',
  'cmd.recentDocs': 'Recent Documents',
  'cmd.actions': 'Actions',
  'cmd.newDoc': 'New Document',

  // Recent docs (Phase 4)
  'recent.title': 'Recently Visited',
  'recent.empty': 'No recent documents',

  // Doc stats (Phase 6)
  'stats.words': '{count} words',
  'stats.readTime': '~{min} min read',

  // Document permissions
  'perm.title': 'Permission',
  'perm.editable': 'Editable',
  'perm.readonly': 'Read-only',
  'perm.private': 'Private',
  'perm.readonlyNotice': 'This document is read-only',
  'perm.privateNotice': 'This document is private',
  'perm.changeFailed': 'Failed to change permission',

  // Page icon & cover
  'pageIcon.addIcon': 'Add icon',
  'pageIcon.addCover': 'Add cover',
  'pageIcon.selectEmoji': 'Choose icon',
  'pageIcon.removeIcon': 'Remove',
  'pageIcon.coverUrlPlaceholder': 'Enter cover image URL...',

  // Document properties panel
  'props.title': 'Properties',
  'props.addProperty': 'Add property',
  'props.keyPlaceholder': 'Property name...',
  'props.valuePlaceholder': 'Empty',
  'props.status': 'Status',
  'props.priority': 'Priority',
  'props.due': 'Due date',
  'props.author': 'Author',
  'props.category': 'Category',
  'props.invalidKey': 'Use letters/digits/_/-, starting with a letter or underscore',
  'props.keyExists': 'Property already exists',

  // Document stats bar
  'statsBar.words': '{count} words',
  'statsBar.chars': '{count} chars',
  'statsBar.charsNoSpace': '{count} chars (no spaces)',
  'statsBar.paragraphs': '{count} paragraphs',
  'statsBar.readTime': '~{min} min read',

  // Tags (Phase 8)
  'tags.add': 'Add tag',
  'tags.placeholder': 'Enter tag name...',

  // Backlinks (Phase 9)
  'backlinks.title': 'Backlinks',
  'backlinks.count': '{count} pages link to this page',
  'backlinks.none': 'No backlinks',

  // Templates (Phase 10)
  'template.select': 'Choose Template',
  'template.blank': 'Blank Document',
  'template.meetingNotes': 'Meeting Notes',
  'template.techSpec': 'Tech Spec',
  'template.readingNotes': 'Reading Notes',

  // Export (Phase 11)
  'export.title': 'Export',
  'export.markdown': 'Export as Markdown',
  'export.html': 'Export as HTML',
  'export.pdfStyled': 'Export Styled PDF',
  'export.pdf': 'Print as PDF',

  // Trash (Phase 12)
  'trash.title': 'Trash',
  'trash.empty': 'Trash is empty',
  'trash.restore': 'Restore',
  'trash.deletePermanently': 'Delete Permanently',
  'trash.emptyTrash': 'Empty Trash',
  'trash.deleteTime': 'Deleted at {time}',
  'trash.confirmEmpty': 'Are you sure you want to empty the trash? This cannot be undone.',
  'trash.confirmEmptyCount': 'Permanently delete {count} items? This cannot be undone.',

  // Import (Phase 13)
  'import.title': 'Import',
  'import.selectFiles': 'Select Markdown files',
  'import.dragHint': 'Drag files here, or click to select',
  'import.importing': 'Importing...',
  'import.failed': 'Import failed',
  'import.networkError': 'Network error, please retry',

  // Attachments (Phase 14)
  'attachment.upload': 'Upload Attachment',
  'attachment.download': 'Download',

  // Comments (Phase 15)
  'comments.title': 'Notes',
  'comments.add': 'Add Note',
  'comments.placeholder': 'Enter note...',
  'comments.empty': 'No notes yet',

  // Shortcuts (Phase 16)
  'shortcuts.title': 'Keyboard Shortcuts',
  'shortcuts.save': 'Save',
  'shortcuts.search': 'Search / Command Palette',
  'shortcuts.slashMenu': 'Insert block',
  'shortcuts.help': 'Shortcuts help',
  'shortcuts.close': 'Close modal / Dismiss',
  'shortcuts.navUpDown': 'Navigate up/down',
  'shortcuts.confirm': 'Confirm selection',
  'shortcuts.groupGlobal': 'Global',
  'shortcuts.groupEditor': 'Editor',
  'shortcuts.groupNav': 'Navigation',

  // Home
  'home.welcome': 'Welcome back',
  'home.subtitle': 'Quick access to your knowledge base',
  'home.newDoc': 'New Document',
  'home.totalDocs': 'Documents',
  'home.totalWords': 'Total Words',
  'home.totalTags': 'Tags',
  'home.totalFolders': 'Folders',
  'home.recentVisited': 'Recently Visited',
  'home.recentUpdated': 'Recently Updated',
  'home.tagCloud': 'Tags',
  'home.words': 'words',
  'home.homepage': 'Home',
  'home.activity': 'Writing Activity (Last 30 Days)',
  'home.less': 'Less',
  'home.more': 'More',
  'home.favorites': 'Favorites',
  'home.favoritesEmpty': 'No favorites yet. Click ☆ on a document to add.',
  'home.randomDoc': 'Random Doc',

  // Favorites
  'favorites.title': 'Favorites',
  'favorites.add': 'Add to favorites',
  'favorites.remove': 'Remove from favorites',

  // Graph View
  'graph.title': 'Knowledge Graph',
  'graph.doc': 'Document',
  'graph.folder': 'Folder',
  'graph.nodeCount': '{count} nodes',
  'graph.edgeCount': '{count} edges',

  // Favorite groups
  'favGroup.ungrouped': 'Ungrouped',
  'favGroup.setGroup': 'Set group',
  'favGroup.newGroup': 'New group...',
  'favGroup.groupPlaceholder': 'Group name...',
  'favGroup.removeGroup': 'Remove from group',

  // Graph view enhanced
  'graph.filterByTag': 'Filter by tag',
  'graph.allTags': 'All',

  // Locale
  'locale.zh': '中文',
  'locale.en': 'English',
  'locale.switch': 'Language',

  // Settings
  'settings.title': 'Settings',
  'settings.tab.llm': 'AI Model',
  'settings.saved': 'Saved',
  'settings.llm.desc': 'All AI features (write, ask, explain, classify) use this configuration. The API key is stored only on the server.',
  'settings.llm.provider': 'Provider',
  'settings.llm.baseUrl': 'Base URL',
  'settings.llm.apiKey': 'API Key',
  'settings.llm.apiKey.envHint': 'Sourced from ARK_API_KEY in .env.local. Editing & saving here writes to wiki-data/_config/llm.json and overrides the env value.',
  'settings.llm.apiKey.fileHint': 'Stored in wiki-data/_config/llm.json (local file, not committed).',
  'settings.llm.model': 'Model ID',
  'settings.llm.temperature': 'Temperature',
  'settings.llm.maxTokens': 'Max tokens',
  'settings.llm.timeoutMs': 'Timeout (ms)',
  'settings.llm.thinking': 'Deep thinking',
  'settings.llm.thinking.hint': 'For seed-1-6+ prefer disabled, otherwise short replies get eaten by reasoning tokens.',
  'settings.llm.test': 'Test connection',
  'settings.llm.testing': 'Testing…',
  'settings.llm.testOk': 'Connected ({ms} ms)',
  'settings.llm.reply': 'Reply',
  'settings.ui.section': 'Interface',
  'settings.ui.aiClassifyHint': 'AI classification hint',
  'settings.ui.aiClassifyHint.desc': 'Auto-suggest folders and tags at the editor bottom-right. Off by default; triggers only after 300+ characters.',

  // BlockNote block menu (Notion-style side menu)
  'bn.menu.searchPlaceholder': 'Search actions…',
  'bn.menu.turnInto': 'Turn into…',
  'bn.menu.color': 'Colour…',
  'bn.menu.copyMarkdown': 'Copy as Markdown',
  'bn.menu.copyText': 'Copy as plain text',
  'bn.menu.copyLink': 'Copy block link',
  'bn.menu.toSubpage': 'Extract to subpage',
  'bn.menu.askAi': 'Ask AI · explain this',
  'bn.menu.delete': 'Delete',
  'bn.menu.deleteShortcut': 'Del',
  'bn.menu.back': 'Back',
  'bn.menu.noResults': 'No matching action',
  'bn.menu.lastEdited': 'Edited {time}',
  'bn.menu.dragHandle': 'Drag / open menu',
  'bn.menu.addBlock': 'Add block (click) / AI (Alt+click)',
  'bn.menu.linkCopied': 'Block link copied',
  'bn.menu.mdCopied': 'Markdown copied',
  'bn.menu.textCopied': 'Plain text copied',
  'bn.menu.subpageCreated': 'Extracted to subpage',
  'bn.menu.subpageFailed': 'Failed to extract subpage',

  // Turn into submenu
  'bn.turn.title': 'Turn into',
  'bn.turn.paragraph': 'Paragraph',
  'bn.turn.h1': 'Heading 1',
  'bn.turn.h2': 'Heading 2',
  'bn.turn.h3': 'Heading 3',
  'bn.turn.bulletList': 'Bulleted list',
  'bn.turn.numberedList': 'Numbered list',
  'bn.turn.checkList': 'To-do list',
  'bn.turn.toggleHeading': 'Toggle heading',
  'bn.turn.quote': 'Quote',
  'bn.turn.code': 'Code block',

  // Colour submenu
  'bn.color.text': 'Text colour',
  'bn.color.background': 'Background colour',
};

export default en;
