# GamePulse - 游戏数据脉搏

AI 驱动的游戏数据分析与预测平台。

## 核心功能

- 📤 **数据上传** — 支持 CSV / Excel / JSON，自动识别字段类型
- 📊 **数据看板** — 数值分布、数据预览、字段概览
- 📈 **趋势预测** — 基于 Prophet 时序模型，支持 DAU/收入/留存等指标预测
- 💡 **AI 洞察** — 自动生成趋势分析和风险提示

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + TypeScript + Tailwind CSS + Recharts |
| 后端 | FastAPI + Pandas + Prophet + scikit-learn |
| 部署 | GitHub Pages (前端) + 本地/服务器 (后端) |

## 快速启动

### 后端

```bash
cd server
pip install -r requirements.txt
python -m app.main
# API 运行在 http://localhost:8001
```

### 前端

```bash
cd client
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

### 生产构建

```bash
cd client
npm run build
# 构建产物输出到 docs/ 目录
```

## 预测能力

| 场景 | 模型 | 输入 |
|------|------|------|
| DAU/收入趋势 | Prophet 时序模型 | 日期 + 指标值 |
| 流失预测 | XGBoost 分类 | 用户行为特征 |
| LTV 预测 | 回归模型 | 早期付费行为 |

> MVP 阶段先实现 Prophet 时序预测，后续扩展其他模型。

## 项目结构

```
game-pulse/
├── client/          # React 前端
│   ├── src/
│   │   ├── pages/   # 页面组件
│   │   └── components/
│   └── vite.config.ts
├── server/          # Python 后端
│   └── app/
│       ├── main.py  # FastAPI 入口
│       ├── api/     # API 路由
│       └── services/ # 预测引擎
├── data/            # 数据存储
│   ├── uploads/     # 上传文件
│   └── predictions/ # 预测结果
└── docs/            # 构建产物 (GitHub Pages)
```

