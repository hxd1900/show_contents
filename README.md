# 模板内容预览（增强 UI）

在内网替代/补充原版「按 ID 平铺预览图」页面：**更清晰的信息架构、加载态、筛选、大图灯箱、深浅色主题、可分享 URL**。

## 使用方式

1. **安装并启动（需能访问内网 API）**

   ```bash
   cd show_contents
   npm install
   npm run dev
   ```

2. 浏览器打开终端里提示的地址（一般为 `http://localhost:5173`）。

3. **传 ID 的两种方式**
   - 在页面里粘贴 ID（逗号或空格分隔），点「加载预览」；
   - 或直接访问：`http://localhost:5173/?ids=195838478,195796713,195800744`

开发环境下，请求会走 Vite 代理到 `https://search-aladdin-lamp.hlgdata.com`，避免浏览器跨域问题。

## 「Unexpected token '<' … is not valid JSON」是什么意思？

`/common/template/ids` 在浏览器里打开时返回的是 **完整 HTML 页面**（你们现有的平铺预览页），不是 JSON。本工具用 `fetch` 拿到的是这段 HTML，按 JSON 解析就会报错。

处理方式（任选）：

1. **嵌入原版**  
   出错后点 **「嵌入原版预览页」**，会在当前站点内用 iframe 打开同一地址，仍能正常看图（和直接打开该链接效果一致）。

2. **配置 JSON 接口（推荐，才能用增强网格）**  
   在已登录/内网打开原版预览页 → F12 → **Network** → 筛选 **Fetch/XHR** → 刷新 → 找到 **Response 为 JSON** 且含模板列表的请求，复制其 **Path（_query 与原版可能不同）**。

   项目根目录复制 `.env.example` 为 `.env`，填写例如：

   ```env
   VITE_JSON_API=/真实路径/如/api/template/query
   ```

   重启 `npm run dev`。若该路径需带 `ids`，与现有页面一致时一般不必改 query，我们会自动带上 `ids`、`page_size`。

## 若预览图不显示

接口字段名可能不一致。勾选 **「显示原始 JSON」** 或把 Network 里 JSON 脱敏后发出来，可在 `src/api.ts` 里补 `IMAGE_KEYS` / 列表路径。

## 构建静态资源（可选）

```bash
npm run build
npm run preview
```

若部署到内网静态服务器，且接口 **已配置 CORS** 允许该域名，需把 `src/api.ts` 里的 `API_PREFIX` 改为完整 API 根地址（或通过环境变量注入）。当前默认仅在 `npm run dev` 时用代理。
