/**
 * 站点基路径。由 vite 的 `base` 决定：
 *  - 默认 `'./'`：本地 dev、Node 服务根部署（`start.bat` / WorkBuddy）都适用
 *  - GitHub Pages 子路径构建时用 `VITE_BASE=/muse-hub/` 覆盖为 `'/muse-hub/'`
 *
 * `content/`、`api/` 这类仓库内资源**必须**经 `asset()` 拼接：
 * 直接用绝对路径 `/content/...` 在子路径部署下会打到域名根，全部 404。
 */
export const BASE: string = import.meta.env.BASE_URL;

/** 把仓库内相对路径（如 `content/scenes/hall-01.json`）拼到站点基路径下 */
export function asset(p: string): string {
  return `${BASE}${p.replace(/^\/+/, '')}`;
}
