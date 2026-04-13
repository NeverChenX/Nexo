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

  // Read page
  'read.selectArticle': 'Select an article to start reading',
  'read.selectFromSidebar': 'Choose from the sidebar',
  'read.collapseSidebar': 'Collapse sidebar',
  'read.expandSidebar': 'Expand sidebar',
  'read.catalog': 'Catalog',
  'read.networkError': 'Network error, please retry',
  'read.loadFailed': 'Failed to load',
  'read.imagePreview': 'Image preview',

  // TOC
  'toc.title': 'Contents',

  // Tree menu
  'tree.catalog': 'Catalog',
  'tree.newSubPage': 'New Sub Page',
  'tree.newSubFolder': 'New Sub Folder',
  'tree.renameTo': 'Rename to:',
  'tree.moveTo': 'Move to:',
  'tree.deleteConfirm': 'Are you sure you want to delete "{name}"?',
  'tree.deleteFolderConfirm': 'Are you sure you want to delete folder "{name}" and all its contents?',
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

  // Share modal
  'share.shareArticle': 'Share Article',
  'share.shareFolder': 'Share Folder',
  'share.description': 'Generate a permanent share link for others to view',
  'share.generate': 'Generate Share Link',
  'share.generating': 'Generating...',
  'share.linkLabel': 'Share Link',
  'share.generateNew': 'Generate New Link',
  'share.generateFailed': 'Generation failed',

  // BlockNote editor
  'bn.newSubPage': 'New Sub Page',
  'bn.newSubPageDesc': 'Create a sub page',
  'bn.pageGroup': 'Page',
  'bn.unnamedPage': 'Unnamed Page',
  'bn.uploadFailed': 'Upload failed',
  'bn.parseFailed': 'Failed to parse content',

  // AI explain
  'ai.title': '✦ AI Explain',
  'ai.explaining': 'Explaining...',
  'ai.explainFailed': 'Explanation failed',
  'ai.requestFailed': 'Request failed',
  'ai.explain': 'AI Explain',

  // Search (Phase 2)
  'search.placeholder': 'Search documents...',
  'search.noResults': 'No documents found',

  // Command palette (Phase 3)
  'cmd.placeholder': 'Search docs or type a command...',
  'cmd.recentDocs': 'Recent Documents',
  'cmd.actions': 'Actions',
  'cmd.newDoc': 'New Document',
  'cmd.goToRead': 'Go to Read Mode',

  // Recent docs (Phase 4)
  'recent.title': 'Recently Visited',
  'recent.empty': 'No recent documents',

  // Doc stats (Phase 6)
  'stats.words': '{count} words',
  'stats.readTime': '~{min} min read',

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
  'template.dailyReport': 'Daily Report',
  'template.readingNotes': 'Reading Notes',

  // Export (Phase 11)
  'export.title': 'Export',
  'export.markdown': 'Export as Markdown',
  'export.html': 'Export as HTML',
  'export.pdf': 'Print as PDF',

  // Trash (Phase 12)
  'trash.title': 'Trash',
  'trash.empty': 'Trash is empty',
  'trash.restore': 'Restore',
  'trash.deletePermanently': 'Delete Permanently',
  'trash.emptyTrash': 'Empty Trash',
  'trash.deleteTime': 'Deleted at {time}',
  'trash.confirmEmpty': 'Are you sure you want to empty the trash? This cannot be undone.',

  // Import (Phase 13)
  'import.title': 'Import',
  'import.selectFiles': 'Select Markdown files',
  'import.dragHint': 'Drag files here, or click to select',
  'import.importing': 'Importing...',

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

  // Locale
  'locale.zh': '中文',
  'locale.en': 'English',
  'locale.switch': 'Language',
};

export default en;
