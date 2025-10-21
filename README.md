# PayPi - Pi Network Payment Application

这是一个基于 [Next.js](https://nextjs.org) 和 Pi Network 的支付应用，支持一对多批量转账功能。

## ✨ 主要功能

- 🔐 **Pi Network 登录认证**
- 💸 **一对一转账**
- 🎯 **一对多批量转账**（支持 U2A → A2U 自动分发）
- 📊 **转账历史记录**
- 🧧 **红包功能**
- 🏪 **商户收款码**
- 📈 **实时汇率查询**

## 🚀 批量转账功能

### 转账流程
```
用户 → 应用钱包 → 多个收款地址
```

用户只需签名一次，资金会自动分发到多个收款地址。

### 快速开始

详细配置请查看：[批量转账快速开始指南](./QUICK_START.md)

## 📦 安装

First, install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🔧 配置

### 环境变量

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/paypi?schema=public"
PI_API_KEY="your_pi_api_key"
PI_WALLET_PRIVATE_SEED="S_YOUR_WALLET_SEED"
```

### 数据库迁移

```bash
# 执行批量转账功能的数据库迁移
npm run db:migrate:batch

# 或使用脚本
./scripts/migrate-batch-transfer.sh  # macOS/Linux
scripts\migrate-batch-transfer.bat   # Windows
```

## 📚 文档

- [📖 批量转账快速开始](./QUICK_START.md)
- [⚙️ 批量转账配置指南](./BATCH_TRANSFER_SETUP.md)
- [📝 实现总结](./IMPLEMENTATION_SUMMARY.md)
- [🔌 Pi Network A2U 支付文档](./public/Pi%20Network%20-%20Node.JS%20server-side%20package%20A2U%20payment.md)

## 🛠️ 技术栈

- **前端**: Next.js 15, React 19, TailwindCSS
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL + Prisma ORM
- **支付**: Pi Network SDK (`pi-backend`)
- **认证**: Pi Network OAuth

## 📱 应用路由

| 路由 | 功能 |
|------|------|
| `/` | 首页 |
| `/oneton` | 一对多批量转账 |
| `/transfer` | 一对一转账 |
| `/history` | 转账历史 |
| `/red-envelope` | 红包功能 |
| `/merchant-code` | 商户收款码 |
| `/me` | 个人中心 |

## 🎯 批量转账核心流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Pi as Pi Browser
    participant App as 应用钱包
    participant API as 后端 API
    participant DB as 数据库
    
    User->>Pi: 发起批量转账
    Pi->>App: U2A 支付（总金额）
    App->>API: 支付完成回调
    API->>DB: 创建批量任务
    loop 每个收款人
        API->>Pi: 创建 A2U 支付
        API->>Pi: 提交到区块链
        API->>Pi: 完成支付
        API->>DB: 更新支付状态
    end
    API->>DB: 更新任务状态
    User->>API: 轮询查询状态
    API->>User: 返回进度信息
```

## 🧪 测试

```bash
# 启动开发服务器
npm run dev

# 打开 Prisma Studio 查看数据
npm run db:studio

# 运行 linter
npm run lint
```

## 📊 数据库命令

| 命令 | 说明 |
|------|------|
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:migrate:batch` | 批量转账功能迁移 |
| `npm run db:deploy` | 生产环境部署迁移 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:generate` | 生成 Prisma Client |

## ⚠️ 重要提示

1. **安全性**: `PI_WALLET_PRIVATE_SEED` 是敏感信息，切勿泄露或提交到版本控制
2. **用户注册**: 批量转账的收款人必须在应用中注册
3. **钱包余额**: 应用钱包需要有足够余额支付 A2U 转账的网络费用
4. **测试环境**: 建议先在 Pi Testnet 上充分测试

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Pi Network 官网](https://minepi.com/)
- [Pi Network 开发者文档](https://developers.minepi.com/)
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)

## 📞 支持

如有问题，请查看：
1. [快速开始指南](./QUICK_START.md) 的常见问题章节
2. [配置指南](./BATCH_TRANSFER_SETUP.md) 的故障排查章节
3. 项目的 Issues 页面
