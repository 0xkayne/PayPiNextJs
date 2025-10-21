# 批量转账功能配置指南

## 功能概述

本项目实现了一对多批量转账功能，流程如下：
1. 用户通过 Pi Browser 发起支付（U2A），将总金额汇总发送到应用钱包
2. 应用钱包接收到支付后，自动向多个收款地址分发资金（A2U）
3. 用户可以实时查看批量转账的处理状态

应用钱包地址：`GCBQFF4M4MBP7QIJFP752BTREDM25VH7XZEEZMHYKSWXCLK4QLCNQMVV`

## 安装依赖

```bash
npm install --save pi-backend
```

## 环境变量配置

在项目根目录创建 `.env` 文件，添加以下配置：

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/paypi?schema=public"

# Pi Network API Configuration
PI_API_KEY="your_pi_api_key_here"

# Pi Network App Wallet Private Seed (starts with 'S')
# IMPORTANT: Keep this secret and never commit to version control
# This is used for A2U (App-to-User) payments
PI_WALLET_PRIVATE_SEED="S_YOUR_WALLET_PRIVATE_SEED_HERE"

# Next.js
NEXT_PUBLIC_APP_NAME="PayPi"
```

### 获取 Pi Network 凭证

1. **PI_API_KEY**: 
   - 登录 [Pi Developer Portal](https://develop.pi/)
   - 在你的应用设置中找到 API Key

2. **PI_WALLET_PRIVATE_SEED**:
   - 这是应用钱包的私钥（以 'S' 开头）
   - 在 Pi Developer Portal 中创建或查看应用钱包
   - ⚠️ **务必保密，不要提交到版本控制系统**

## 数据库迁移

运行以下命令来创建批量转账相关的数据库表：

```bash
npx prisma migrate dev --name add_batch_transfer_tables
```

或者如果已有迁移文件，直接应用：

```bash
npx prisma migrate deploy
```

## 数据库表结构

### BatchTransferTask (批量转账任务)
- 记录每次批量转账的总体信息
- 包含批次ID、总金额、收款人数量、状态等

### A2UPayment (A2U 支付记录)
- 记录每笔 A2U 支付的详细信息
- 包含支付ID、收款地址、金额、状态、交易ID等

## 使用流程

### 1. 用户发起批量转账

在前端 `/oneton` 页面：
- 输入多个收款地址和金额
- 点击"继续转账"按钮
- Pi Browser 会提示用户确认支付总金额

### 2. 后端处理

支付完成后，`/api/v1/payments/complete` 接口会：
- 检测到这是批量转账（通过 metadata.batchId）
- 创建 BatchTransferTask 记录
- 为每个收款人创建 A2U 支付
- 依次提交到区块链并完成

### 3. 查询状态

前端会每 3 秒轮询 `/api/v1/batch-transfer/status?batchId=xxx` 接口：
- 查询批量转账的整体状态
- 显示每笔支付的详细状态
- 当所有支付完成或失败后停止轮询

## API 接口

### 批量转账状态查询
```
GET /api/v1/batch-transfer/status?batchId={batchId}
```

响应示例：
```json
{
  "batchId": "batch_1234567890",
  "status": "completed",
  "totalAmount": "10.5",
  "recipientCount": 3,
  "statusCounts": {
    "completed": 3,
    "failed": 0
  },
  "payments": [
    {
      "toAddress": "GXXX...XXX",
      "amount": "3.5",
      "status": "completed",
      "txid": "abc123...",
      "errorMessage": null
    }
  ]
}
```

## 注意事项

### 1. 用户必须在系统中注册

A2U 支付需要收款人的 Pi uid，因此：
- 收款人必须在你的应用中注册过
- 系统会通过钱包地址查找对应的用户 ID
- 如果找不到用户，该笔转账会失败

解决方案：
- 要求所有用户先注册
- 或者修改前端，让用户选择已注册的用户而不是输入地址

### 2. 异步处理

批量转账是异步处理的，用户支付完成后：
- 立即返回成功响应
- 后台慢慢处理每笔 A2U 支付
- 前端通过轮询获取进度

### 3. 错误处理

如果某笔 A2U 支付失败：
- 会记录失败原因
- 不会影响其他支付
- 任务状态会标记为 'partial_completed' 或 'failed'

### 4. 性能优化建议

对于大规模批量转账，建议：
- 使用消息队列（如 Redis + Bull）
- 实现重试机制
- 添加速率限制
- 设置支付超时

## 测试

### 测试流程
1. 确保有测试用户在系统中注册
2. 在 `/oneton` 页面添加测试用户的钱包地址
3. 发起小额测试转账（如 0.01 Pi）
4. 观察控制台日志和数据库记录

### 查看日志
```bash
# 开发模式下查看实时日志
npm run dev

# 生产环境查看日志
pm2 logs
```

## 故障排查

### 问题：A2U 支付失败，错误 "Cannot find user"

**原因**：收款人未在系统注册

**解决**：
- 确保收款人先在应用中登录/注册
- 或者修改代码，让前端传递 uid 而不是地址

### 问题：支付创建失败

**原因**：Pi Network API 配置错误

**解决**：
- 检查 `PI_API_KEY` 是否正确
- 检查 `PI_WALLET_PRIVATE_SEED` 是否正确
- 确保应用钱包有足够余额

### 问题：数据库连接失败

**原因**：DATABASE_URL 配置错误

**解决**：
- 检查数据库连接字符串
- 确保数据库已启动
- 运行 `npx prisma migrate deploy`

## 文件清单

### 新增文件
- `lib/pi-network.ts` - Pi Network SDK 封装
- `app/api/v1/batch-transfer/status/route.ts` - 状态查询接口
- `BATCH_TRANSFER_SETUP.md` - 配置文档（本文件）

### 修改文件
- `prisma/schema.prisma` - 添加 BatchTransferTask 和 A2UPayment 表
- `app/api/v1/payments/complete/route.ts` - 添加批量转账处理逻辑
- `app/oneton/page.tsx` - 添加状态查询和显示功能

## 参考文档

- [Pi Network Node.js SDK](https://github.com/pi-apps/pi-platform-docs/blob/master/SDK_reference.md)
- [Pi Apps Platform Documentation](https://developers.minepi.com/)
- [A2U Payment Guide](public/Pi%20Network%20-%20Node.JS%20server-side%20package%20A2U%20payment.md)

