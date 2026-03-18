# 内容预览 — 神灯不再简陋后台

在内网替代/补充原版「按 ID 平铺预览图」页面，支持 **稿定** 与 **花瓣** 双平台：更清晰的信息架构、加载态、筛选、大图灯箱、深浅色主题、可分享 URL、简化视图等。

## 功能概览

- **双平台**：稿定、花瓣；输入框按平台独立保存，切换平台互不影响
- **列表能力**：默认 / 从新到旧 / 从旧到新 / 手动排序；筛选 ID 或标题；卡片尺寸调节；简化 / 详细视图
- **花瓣**：PIN_ID 展示与复制、在花瓣打开、版权素材角标（©）
- **灯箱**：大图预览、标题/内容ID/PIN_ID 复制、大内容打开 / 在花瓣打开
- **主题**：深色模式、浅色模式
- **其他**：返回顶部、批量选择/删除、生成分享链接；网络不可达时提示「需连公司内网才能打开哦」

## 本地使用

1. **安装并启动（需能访问内网 API）**

   ```bash
   git clone https://github.com/hxd1900/show_contents.git
   cd show_contents
   npm install
   npm run dev
   ```

2. 浏览器打开终端里提示的地址（一般为 `http://localhost:5173`）。

3. **传 ID**
   - 在页面选择平台，粘贴 ID（逗号或空格分隔），回车或点击加载；
   - 或直接访问：`http://localhost:5173/?ids=195838478,195796713&platform=gaoding`

开发环境下，请求会走 Vite 代理到内网 API 地址，避免浏览器跨域问题。

## 环境变量（可选）

项目根目录复制 `.env.example` 为 `.env`，按需填写：

```env
# 稿定/花瓣等接口的 JSON 路径（若与原版不一致，可从 Network 里抓取）
VITE_JSON_API=/真实路径/如/api/template/query
```

若使用代理默认地址则可不配置。

## 构建与部署

```bash
npm run build
```

产物在 `dist/`。可用 `npm run preview` 本地预览。

### 部署到 Vercel

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录；
2. Import 本仓库，构建命令 `npm run build`，输出目录 `dist`；
3. Deploy 后即可获得访问链接，后续 `git push` 会自动重新部署。

### 部署到 Gitee Pages（国内访问）

1. 在 Gitee 从 GitHub 导入本仓库；
2. 仓库 → 服务 → Gitee Pages，分支选 `main`，构建为静态站点（或自定义：`npm run build`，发布目录 `dist`）；
3. 启动后使用生成的 `.gitee.io` 链接访问。

若部署到其他静态托管，需确保接口已配置 CORS 或使用同源代理；必要时在 `src/api.ts` 中调整 `API_PREFIX` 或通过环境变量注入。

## 常见问题

- **「Unexpected token '<' … is not valid JSON」**：接口返回了 HTML 而非 JSON。可点「嵌入原版预览页」用 iframe 看图，或按上文配置正确的 `VITE_JSON_API`。
- **预览图不显示**：接口字段名可能不一致，可在 `src/api.ts` 中调整 `IMAGE_KEYS` / 列表路径；或勾选「显示原始 JSON」对比数据结构。
- **提示「需连公司内网才能打开哦」**：请求失败且判定为网络不可达，请连接公司内网后重试。

## 技术栈

- React 18 + TypeScript
- Vite 5
- Framer Motion

## License

Private / 内部使用。
