# 贡献指南 / Contributing Guide

感谢你关注 **数字博物馆 / MuseHub**！本项目以 MIT 协议开源，欢迎以 Issue、Pull Request 等形式参与共建。
Thanks for your interest in **数字博物馆 / MuseHub**! This project is open-source under the MIT License.
Contributions of any kind—issues, pull requests, docs, translations—are welcome.

---

## 一、行为准则 / Code of Conduct

- 请友好、尊重地交流，专注于技术与内容本身。
  Please communicate respectfully and keep discussions focused on the project.
- 禁止提交任何侵犯版权或含敏感/违规内容的数据与素材。
  Do not submit copyrighted, sensitive, or non-compliant assets.

## 二、如何贡献 / How to Contribute

### 报告问题 / Report an Issue
1. 先在 [Issues](https://github.com/xiangsir4088/muse-hub/issues) 中搜索是否已有相同问题。
   Search [Issues](https://github.com/xiangsir4088/muse-hub/issues) before opening a new one.
2. 新建 Issue，注明：复现步骤、预期/实际表现、浏览器与系统版本、控制台报错截图。
   Open a new issue with: steps to reproduce, expected vs. actual behavior, browser/OS, console errors.

### 提交代码 / Submit a Pull Request
1. Fork 本仓库到你的账号，然后克隆：
   Fork the repo, then clone:
   ```bash
   git clone https://github.com/<你的用户名>/muse-hub.git
   cd muse-hub
   ```
2. 创建特性分支（勿直接在 `main` 上改）：
   Create a feature branch (do not edit `main` directly):
   ```bash
   git checkout -b feat/your-feature
   ```
3. 安装依赖并本地验证（参见 README「开发命令」）：
   Install deps and verify locally (see "Development Commands" in README):
   ```bash
   npm install
   npm run typecheck
   npm test
   npm run dev        # 启动开发服务器自测
   ```
4. 提交信息使用清晰的中文或英文短句，建议前缀：
   Write clear commit messages; suggested prefixes:
   `feat:` 新功能 / `fix:` 修复 / `docs:` 文档 / `style:` 格式 / `refactor:` 重构 / `test:` 测试 / `chore:` 杂项
5. 推送到你的 Fork 并发起 Pull Request 到 `xiangsir4088/muse-hub:main`。
   Push to your fork and open a PR against `xiangsir4088/muse-hub:main`.

## 三、内容扩展 / Extending Content

本项目的展品、场景、导览均**以文件形式**存放在 `content/` 目录，无需改动代码即可扩展：
Exhibits, scenes, and tours live as **files** under `content/`; you can extend them without touching code:

- `content/exhibits/*.json` — 单个展品（名称、年代、材质、铭牌、鉴赏文案、热点坐标）
  Single exhibit (name, era, material, plate, inspection text, hotspot coordinates)
- `content/scenes/*.json` — 展厅布局（展品摆放、壁画、灯光）
  Hall layout (exhibit placement, murals, lighting)
- `content/tours/*.json` — 多语言导览路线
  Multilingual guided-tour routes

字段格式详见 README「内容管理」章节的逐字段说明表。
See the field-by-field tables in the README "Content Management" section.

提交新内容时请同时提供 `zh` 与 `en` 文案，保持中英双语一致。
When adding content, please provide both `zh` and `en` text for bilingual consistency.

## 四、代码风格 / Code Style

- TypeScript 严格模式；改动后必须通过 `npm run typecheck`。
  TypeScript strict mode; changes must pass `npm run typecheck`.
- 前端 UI 文案需走 `src/i18n.ts` 词典，勿硬编码中文到菜单。
  UI strings go through `src/i18n.ts`; do not hard-code Chinese into menus.
- 墙面讲解类文案以中文为主、中英双语呈现，符合中国博物馆惯例。
  Wall didactics are Chinese-primary with bilingual (zh/en) presentation.
- 新增功能请配套 Vitest 测试。
  Add Vitest tests for new features.

## 五、许可 / License

贡献即表示你同意以 **MIT 协议** 发布你的改动。
By contributing, you agree your changes are released under the **MIT License**.
