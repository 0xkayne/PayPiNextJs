#!/bin/bash

# 批量转账功能数据库迁移脚本

echo "🚀 开始执行批量转账数据库迁移..."

# 检查 Prisma 是否安装
if ! command -v npx &> /dev/null; then
    echo "❌ 错误: 未找到 npx 命令"
    echo "请先安装 Node.js 和 npm"
    exit 1
fi

# 检查 DATABASE_URL 是否配置
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  警告: DATABASE_URL 环境变量未设置"
    echo "请在 .env 文件中配置 DATABASE_URL"
    echo ""
    echo "示例："
    echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/paypi?schema=public\""
    exit 1
fi

# 执行迁移
echo ""
echo "📦 生成迁移文件..."
npx prisma migrate dev --name add_batch_transfer_tables

# 检查迁移是否成功
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库迁移成功完成！"
    echo ""
    echo "📋 已创建的表："
    echo "  - BatchTransferTask (批量转账任务)"
    echo "  - A2UPayment (A2U 支付记录)"
    echo ""
    echo "🎉 现在可以使用批量转账功能了！"
    echo ""
    echo "下一步："
    echo "  1. 配置环境变量 PI_API_KEY 和 PI_WALLET_PRIVATE_SEED"
    echo "  2. 重启开发服务器: npm run dev"
    echo "  3. 访问 /oneton 页面测试功能"
else
    echo ""
    echo "❌ 数据库迁移失败"
    echo "请检查："
    echo "  - 数据库连接是否正常"
    echo "  - DATABASE_URL 是否配置正确"
    echo "  - 数据库服务是否启动"
    exit 1
fi

