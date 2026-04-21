# Never Wiki 外部 API 文档

## 概述

Never Wiki 提供 RESTful API 供外部系统（局域网、其他服务）调用，实现页面的增删改查。

- **Base URL**: `http://<your-host>:3000/api/v1`
- **认证方式**: Bearer Token（API Key）
- **数据格式**: JSON

---

## 认证

所有请求必须在 HTTP 头中携带 API Key：

```
Authorization: Bearer <your-api-key>
```

API Key 在服务端的 `.env.local` 文件中配置：

```
WIKI_API_KEY=your-secret-key-here
```

### 错误响应

| 状态码 | 说明 |
|--------|------|
| 401 | 缺少 Authorization 头 |
| 403 | API Key 无效 |
| 503 | 服务端未配置 WIKI_API_KEY |

---

## 页面模型

Wiki 使用文件系统存储，页面有两种形态：

- **叶子页面**: 无子页面的普通文档
- **父页面**: 有子页面的文档（自动提升）

每个页面有：
- `path` — 路径，如 `"笔记/技术/Go语言"`
- `id` — 路径的 MD5 哈希值（32 位十六进制）
- `content` — Markdown 内容
- `isFolder` — 是否为父页面

---

## 接口列表

### 1. 创建页面

**POST** `/api/v1/pages`

创建一个新页面。如果父路径是叶子页面，会自动提升为父页面。

**请求体：**

```json
{
  "path": "笔记/技术/Go语言",
  "content": "# Go 语言笔记\n\n这是内容...",
  "overwrite": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 页面路径，用 `/` 分隔层级 |
| content | string | 否 | Markdown 内容，默认为空 |
| overwrite | boolean | 否 | 页面已存在时是否覆盖，默认 false |

**成功响应 (200)：**

```json
{
  "ok": true,
  "data": {
    "path": "笔记/技术/Go语言",
    "id": "a1b2c3d4e5f6...",
    "content": "# Go 语言笔记\n\n这是内容...",
    "created": true,
    "updated": false
  }
}
```

**错误响应 (409)：** 页面已存在且未传 `overwrite: true`

**curl 示例：**

```bash
curl -X POST http://192.168.31.85:3000/api/v1/pages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "笔记/技术/Go语言",
    "content": "# Go 语言笔记\n\n这是内容..."
  }'
```

---

### 2. 读取页面

**GET** `/api/v1/pages?path=<路径>` 或 `?id=<ID>`

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| path | string | 页面路径（与 id 二选一） |
| id | string | 页面 ID，即路径的 MD5 |

**成功响应 (200)：**

```json
{
  "ok": true,
  "data": {
    "path": "笔记/技术/Go语言",
    "id": "a1b2c3d4e5f6...",
    "content": "# Go 语言笔记\n\n这是内容...",
    "isFolder": false
  }
}
```

**curl 示例：**

```bash
# 按路径读取
curl "http://192.168.31.85:3000/api/v1/pages?path=笔记/技术/Go语言" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 按 ID 读取
curl "http://192.168.31.85:3000/api/v1/pages?id=a1b2c3d4e5f6..." \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### 3. 获取页面树

**GET** `/api/v1/pages?action=tree`

返回完整的页面树结构。

**成功响应 (200)：**

```json
{
  "ok": true,
  "data": [
    {
      "name": "笔记",
      "path": "笔记",
      "isFolder": true,
      "children": [
        {
          "name": "技术",
          "path": "笔记/技术",
          "isFolder": true,
          "children": [
            {
              "name": "Go语言",
              "path": "笔记/技术/Go语言",
              "isFolder": false
            }
          ]
        }
      ]
    }
  ]
}
```

**curl 示例：**

```bash
curl "http://192.168.31.85:3000/api/v1/pages?action=tree" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### 4. 更新页面

**PUT** `/api/v1/pages`

更新已有页面的内容。

**请求体：**

```json
{
  "path": "笔记/技术/Go语言",
  "content": "# Go 语言笔记（更新版）\n\n新内容..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是* | 页面路径（与 id 二选一） |
| id | string | 是* | 页面 ID（与 path 二选一） |
| content | string | 是 | 新的 Markdown 内容 |

**curl 示例：**

```bash
curl -X PUT http://192.168.31.85:3000/api/v1/pages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "笔记/技术/Go语言",
    "content": "# Go 语言笔记（更新版）\n\n新内容..."
  }'
```

---

### 5. 删除页面

**DELETE** `/api/v1/pages?path=<路径>` 或 `?id=<ID>`

删除页面。如果是父页面（文件夹），会同时删除所有子页面。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| path | string | 页面路径（与 id 二选一） |
| id | string | 页面 ID（与 path 二选一） |

**curl 示例：**

```bash
curl -X DELETE "http://192.168.31.85:3000/api/v1/pages?path=笔记/技术/Go语言" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 通用响应格式

所有接口统一返回：

```json
{
  "ok": true,    // 是否成功
  "data": {},    // 成功时的数据
  "error": ""    // 失败时的错误信息
}
```

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 认证失败 |
| 404 | 页面不存在 |
| 409 | 页面已存在（创建时未传 overwrite） |
| 500 | 服务器内部错误 |
| 503 | 服务端未配置 API Key |

---

## 完整使用示例

### Python

```python
import requests

BASE = "http://192.168.31.85:3000/api/v1"
HEADERS = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
}

# 创建页面
resp = requests.post(f"{BASE}/pages", json={
    "path": "API测试/Hello",
    "content": "# Hello\n\n通过 API 创建的页面",
}, headers=HEADERS)
print(resp.json())

# 读取页面
resp = requests.get(f"{BASE}/pages", params={"path": "API测试/Hello"}, headers=HEADERS)
print(resp.json())

# 更新页面
resp = requests.put(f"{BASE}/pages", json={
    "path": "API测试/Hello",
    "content": "# Hello（已更新）\n\n内容已修改",
}, headers=HEADERS)
print(resp.json())

# 获取页面树
resp = requests.get(f"{BASE}/pages", params={"action": "tree"}, headers=HEADERS)
print(resp.json())

# 删除页面
resp = requests.delete(f"{BASE}/pages", params={"path": "API测试/Hello"}, headers=HEADERS)
print(resp.json())
```

### Shell (curl)

```bash
API_KEY="YOUR_API_KEY"
BASE="http://192.168.31.85:3000/api/v1"

# 创建
curl -X POST "$BASE/pages" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"path":"API测试/Shell示例","content":"# Shell 示例\n\n通过 curl 创建"}'

# 读取
curl "$BASE/pages?path=API测试/Shell示例" \
  -H "Authorization: Bearer $API_KEY"

# 更新
curl -X PUT "$BASE/pages" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"path":"API测试/Shell示例","content":"# 更新后\n\n新内容"}'

# 页面树
curl "$BASE/pages?action=tree" \
  -H "Authorization: Bearer $API_KEY"

# 删除
curl -X DELETE "$BASE/pages?path=API测试/Shell示例" \
  -H "Authorization: Bearer $API_KEY"
```

### JavaScript / Node.js

```javascript
const BASE = "http://192.168.31.85:3000/api/v1";
const API_KEY = "YOUR_API_KEY";

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// 创建页面
const res = await fetch(`${BASE}/pages`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    path: "API测试/JS示例",
    content: "# JS 示例\n\n通过 fetch 创建",
  }),
});
console.log(await res.json());
```

---

## 注意事项

1. **路径规则**: 使用 `/` 分隔层级，不能以 `/` 开头或包含 `..`
2. **自动提升**: 创建子页面时，如果父路径是普通页面会自动提升为文件夹页面
3. **ID 计算**: `id = MD5(path)`，可用于在不知道完整路径时定位页面
4. **内容格式**: 支持标准 Markdown，首行 `# 标题` 会作为页面标题显示
5. **Frontmatter**: 支持 YAML frontmatter，如 `tags: [标签1, 标签2]`
6. **编码**: 路径中的中文等非 ASCII 字符需 URL 编码（GET/DELETE 的 query 参数中）
