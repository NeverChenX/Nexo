export interface Template {
  id: string;
  nameKey: string; // i18n key
  content: string;
}

export const defaultTemplates: Template[] = [
  {
    id: 'blank',
    nameKey: 'template.blank',
    content: '# {title}',
  },
  {
    id: 'meeting',
    nameKey: 'template.meetingNotes',
    content: `# {title}

## 基本信息

- **日期**：
- **参会人**：
- **会议主题**：

## 议程

1.

## 讨论要点



## 待办事项

- [ ]
- [ ]

## 下次会议

- **时间**：
- **议题**：
`,
  },
  {
    id: 'tech-spec',
    nameKey: 'template.techSpec',
    content: `# {title}

## 背景

描述问题背景和动机。

## 目标

-

## 方案设计

### 整体架构



### 核心流程



### 数据模型



## 风险与约束

| 风险 | 影响 | 应对 |
|------|------|------|
|  |  |  |

## 里程碑

| 阶段 | 内容 | 预期完成 |
|------|------|----------|
|  |  |  |

## 参考

-
`,
  },
  {
    id: 'reading',
    nameKey: 'template.readingNotes',
    content: `# {title}

## 基本信息

- **作者**：
- **出版年份**：
- **评分**：⭐⭐⭐⭐⭐

## 核心观点



## 关键摘录

>

## 我的思考



## 行动要点

-
`,
  },
];

export function getTemplateContent(templateId: string, title: string): string {
  const template = defaultTemplates.find((t) => t.id === templateId);
  const content = template ? template.content : `# ${title}`;
  return content.replace(/\{title\}/g, title);
}
