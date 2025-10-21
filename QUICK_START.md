# 批量转账功能 - 快速开始指南

## 🚀 快速部署（5 分钟）

### 步骤 1: 安装依赖

```bash
npm install
```

### 步骤 2: 配置环境变量

创建 `.env` 文件：

```bash
# 复制示例配置
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/paypi?schema=public"
PI_API_KEY="your_pi_api_key"
PI_WALLET_PRIVATE_SEED="S_YOUR_WALLET_SEED"
EOF
```

**获取 Pi Network 凭证：**
1. 访问 [Pi Developer Portal](https://develop.pi/)
2. 获取你的 API Key
3. 获取应用钱包的 Private Seed（以 'S' 开头）

### 步骤 3: 运行数据库迁移

**方式 1 - 使用 npm 脚本（推荐）：**
```bash
npm run db:migrate:batch
```

**方式 2 - 使用迁移脚本：**
```bash
# macOS/Linux
./scripts/migrate-batch-transfer.sh

# Windows
scripts\migrate-batch-transfer.bat
```

**方式 3 - 手动执行：**
```bash
npx prisma migrate dev --name add_batch_transfer_tables
```

### 步骤 4: 启动开发服务器

```bash
npm run dev
```

### 步骤 5: 测试功能

1. 在 Pi Browser 中打开应用
2. 导航到 `/oneton` 页面
3. 添加测试收款地址和金额
4. 发起转账测试

## 📝 配置检查清单

- [ ] 数据库已启动并可连接
- [ ] `.env` 文件已创建并配置
- [ ] `PI_API_KEY` 已设置
- [ ] `PI_WALLET_PRIVATE_SEED` 已设置
- [ ] 数据库迁移已执行
- [ ] 依赖包已安装
- [ ] 应用钱包有足够余额

## 🔍 验证安装

### 检查数据库表
```bash
npm run db:studio
```
在 Prisma Studio 中应该能看到：
- `BatchTransferTask` 表
- `A2UPayment` 表

### 检查 API 接口
```bash
# 测试状态查询接口（应返回 404）
curl http://localhost:3000/api/v1/batch-transfer/status?batchId=test
```

## 📊 转账流程图

```
用户发起支付 (U2A)
    ↓
支付到应用钱包: GCBQFF4M4MBP7QIJFP752BTREDM25VH7XZEEZMHYKSWXCLK4QLCNQMVV
    ↓
后端处理 (异步)
    ├→ 创建 A2U 支付 → 收款人 1
    ├→ 创建 A2U 支付 → 收款人 2
    └→ 创建 A2U 支付 → 收款人 3
    ↓
前端轮询状态
    ↓
显示完成结果
```

## 🎯 NPM 脚本命令

| 命令 | 说明 |
|------|------|
| `npm run db:migrate:batch` | 执行批量转账数据库迁移 |
| `npm run db:migrate` | 执行所有待处理的迁移 |
| `npm run db:deploy` | 生产环境迁移部署 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:generate` | 生成 Prisma Client |

## ⚠️ 常见问题

### 1. 数据库连接失败
```
Error: Can't reach database server
```
**解决方法：**
- 检查数据库服务是否启动
- 验证 `DATABASE_URL` 配置是否正确
- 确认防火墙设置

### 2. Pi Network API 错误
```
Error: Pi Network credentials not configured
```
**解决方法：**
- 确认 `PI_API_KEY` 已设置
- 确认 `PI_WALLET_PRIVATE_SEED` 已设置
- 重启开发服务器

### 3. 收款人未找到
```
Error: Cannot find user for address
```
**解决方法：**
- 确保收款人已在应用中注册
- 收款人的钱包地址已保存到数据库
- 检查地址格式是否正确（56位大写字母数字）

### 4. 迁移已存在
```
Migration 'add_batch_transfer_tables' already exists
```
**解决方法：**
这是正常的，说明迁移已经执行过了。可以使用：
```bash
npx prisma migrate deploy
```

## 📖 详细文档

- [完整配置指南](./BATCH_TRANSFER_SETUP.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
- [A2U 支付文档](./public/Pi%20Network%20-%20Node.JS%20server-side%20package%20A2U%20payment.md)

## 🧪 测试流程

### 1. 准备测试数据
```bash
# 在 Pi Browser 中登录应用
# 确保至少有 2 个测试账号
```

### 2. 发起测试转账
- 打开 `/oneton` 页面
- 添加测试地址（至少 2 个）
- 输入小额金额（如 0.01 Pi）
- 点击"继续转账"

### 3. 观察日志
```bash
# 开发模式下可以在控制台看到详细日志
npm run dev
```

### 4. 查看数据库
```bash
# 打开 Prisma Studio
npm run db:studio

# 查看 BatchTransferTask 和 A2UPayment 表
```

## 🎉 成功标志

如果一切正常，你应该看到：
1. ✅ 前端显示"支付已提交，正在分发..."
2. ✅ 后端控制台输出处理日志
3. ✅ 数据库中有 BatchTransferTask 记录
4. ✅ 每个收款人都有对应的 A2UPayment 记录
5. ✅ 前端显示"所有转账已成功完成！"

## 🆘 需要帮助？

1. 查看 [配置指南](./BATCH_TRANSFER_SETUP.md) 的故障排查章节
2. 检查控制台和网络请求日志
3. 在 Prisma Studio 中检查数据库状态
4. 参考 Pi Network 官方文档

---

**祝你使用愉快！** 🎊

