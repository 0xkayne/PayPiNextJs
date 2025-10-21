@echo off
REM 批量转账功能数据库迁移脚本 (Windows)

echo 🚀 开始执行批量转账数据库迁移...
echo.

REM 检查 .env 文件是否存在
if not exist ".env" (
    echo ⚠️  警告: 未找到 .env 文件
    echo 请先创建 .env 文件并配置 DATABASE_URL
    echo.
    echo 示例:
    echo DATABASE_URL="postgresql://user:password@localhost:5432/paypi?schema=public"
    pause
    exit /b 1
)

REM 执行迁移
echo 📦 生成迁移文件...
echo.
call npx prisma migrate dev --name add_batch_transfer_tables

if %errorlevel% equ 0 (
    echo.
    echo ✅ 数据库迁移成功完成！
    echo.
    echo 📋 已创建的表:
    echo   - BatchTransferTask ^(批量转账任务^)
    echo   - A2UPayment ^(A2U 支付记录^)
    echo.
    echo 🎉 现在可以使用批量转账功能了！
    echo.
    echo 下一步:
    echo   1. 配置环境变量 PI_API_KEY 和 PI_WALLET_PRIVATE_SEED
    echo   2. 重启开发服务器: npm run dev
    echo   3. 访问 /oneton 页面测试功能
) else (
    echo.
    echo ❌ 数据库迁移失败
    echo 请检查:
    echo   - 数据库连接是否正常
    echo   - DATABASE_URL 是否配置正确
    echo   - 数据库服务是否启动
    pause
    exit /b 1
)

echo.
pause

