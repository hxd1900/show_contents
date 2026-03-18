# 内容预览 — 神灯不再简陋后台

在内网替代/补充原版「按 ID 平铺预览图」页面，支持 **稿定** 与 **花瓣** 双平台：更清晰的信息架构、加载态、筛选、大图灯箱、深浅色主题、可分享 URL、简化视图等。

## 功能概览

- **双平台**：稿定、花瓣；输入框按平台独立保存，切换平台互不影响
- **列表能力**：默认 / 从新到旧 / 从旧到新 / 手动排序；筛选 ID 或标题；卡片尺寸调节；简化 / 详细视图
- **花瓣**：PIN_ID 展示与复制、在花瓣打开、版权素材角标（©）
- **灯箱**：大图预览、标题/内容ID/PIN_ID 复制、大内容打开 / 在花瓣打开
- **主题**：深色模式、浅色模式
- **其他**：返回顶部、批量选择/删除、生成分享链接；

## 部署到 Netlify / Vercel 后接口 404 或「返回 HTML」

页面部署在公网，但接口在公司内网。需在 **构建时** 注入内网 API 根地址，且**同事打开链接时须连公司内网 / VPN**，浏览器才能请求到接口。

1. **Netlify**：Site settings → Environment variables → Add variable  
   - Key：`VITE_API_BASE`  
   - Value：`https://search-aladdin-lamp.hlgdata.com`（或你们实际的内网 API 根地址）  
   - 保存后重新 Deploy 一次（Build 会带上该变量）。

2. **Vercel**：Project → Settings → Environment Variables  
   - Name：`VITE_API_BASE`  
   - Value：`https://search-aladdin-lamp.hlgdata.com`  
   - 保存后重新 Deploy。

若**原网站能打开**但本应用仍提示请求失败，多半是 **CORS 跨域**：内网接口未允许来自 Netlify/Vercel 域名的请求。可选方案：  
- 将本应用部署到与接口**同域**（如公司内网同一域名下）；或  
- 联系后端在接口上为 `https://show-contents.netlify.app` 等域名配置 CORS 放行。

Private / 内部使用。
