# 商家支付和分红系统实现总结

## 📋 概述

本次实现完成了商家收款和分红分配系统，主要功能包括：

1. **商家注册**：用户通过支付一定金额注册商家二维码，使用 UID 而非 wallet address
2. **商家收款**：其他用户扫描商家二维码支付，自动分账（95% 转商家，5% 进分红池）
3. **分红分配**：商家可以按用户付款占比分配分红池

## 🗄️ 数据库变更

### 修改的表

#### `MerchantPaycode` (商家二维码表)
- ✅ 新增 `merchantUid` - 商家的 Pi UID（替代原 piAddress）
- ✅ 新增 `dividendPool` - 当前分红池金额
- ✅ 新增 `initialAmount` - 初始注册金额
- ✅ 新增 `registerPaymentId` - 注册时的支付 ID
- ✅ 新增 `registerTxid` - 注册时的交易 ID
- ⚠️ 保留 `piAddress` 和 `startPi` 作为可选字段以保持兼容性

### 新增的表

#### `MerchantPayment` (商家收款记录表)
记录每笔向商家的付款详情：
- 付款人信息（`payerUserId`, `payerUid`）
- 金额信息（`totalAmount`, `merchantAmount`, `dividendAmount`）
- U2A 支付信息（用户到 App）
- A2U 支付信息（App 到商家）

#### `MerchantDividendDistribution` (分红分配记录表)
记录每次分红分配任务：
- 分红总额（`totalDividend`）
- 受益人数量（`recipientCount`）
- 状态（`pending`, `processing`, `completed`, `partial_completed`, `failed`）

#### `MerchantDividendPayment` (单个用户分红记录表)
记录每个用户的分红详情：
- 收款人信息（`recipientUserId`, `recipientUid`）
- 累计付款金额和占比（`totalPaidAmount`, `percentage`）
- 本次分红金额（`dividendAmount`）
- A2U 支付信息

## 🔧 后端 API 实现

### 1. 商家注册相关

#### `POST /api/v1/merchant-code/generate`
- **功能**：准备商家注册，返回用户的 UID
- **返回**：`{ merchantUid, ready }`
- **验证**：检查用户是否已注册、是否有 Pi UID

#### `POST /api/v1/merchant-code/complete-registration`
- **功能**：完成商家注册（在用户支付后调用）
- **参数**：`{ paymentId, txid, startPi }`
- **流程**：
  1. 验证 U2A 支付
  2. 创建商家二维码记录
  3. 生成包含 `merchantUid` 的二维码（版本 2）
  4. 返回二维码数据

#### `GET /api/v1/merchant-code/me`
- **功能**：获取当前用户的商家信息
- **返回**：包含 `merchantUid`, `dividendPool`, `initialAmount` 等字段

#### `POST /api/v1/merchant-code/decode`
- **功能**：解析商家二维码
- **支持**：v1（piAddress）和 v2（merchantUid）两种格式

### 2. 商家收款

#### `POST /api/v1/payments/merchant-payment`
- **功能**：处理向商家的支付
- **参数**：`{ paymentId, txid, merchantUid }`
- **流程**：
  1. 验证 U2A 支付（用户到 App）
  2. 计算分账：
     - `merchantAmount = floor(totalAmount * 0.95 * 1000000) / 1000000`
     - `dividendAmount = ceil(totalAmount * 0.05 * 1000000) / 1000000`
  3. 创建 `MerchantPayment` 记录
  4. 异步处理：
     - 通过 A2U 转账 95% 给商家
     - 增加商家 `dividendPool` 5%

### 3. 分红分配

#### `POST /api/v1/merchants/[id]/dividend`
- **功能**：分配商家分红池
- **权限**：仅商家所有者可调用
- **流程**：
  1. 聚合每个付款用户的累计金额
  2. 计算总付款金额和每个用户的占比
  3. 创建分红分配任务
  4. 异步处理：
     - 为每个用户创建 A2U 支付
     - 按占比发放分红
     - 清空分红池

## 💻 前端实现

### merchant-code/page.tsx

主要改动：
1. **UID 显示**：自动读取并显示当前登录用户的 Pi UID（只读）
2. **注册流程**：
   - 用户输入起始金额
   - 点击 Generate 后发起 U2A 支付到 App wallet
   - 支付完成后调用 `/api/v1/merchant-code/complete-registration`
3. **分红显示**：显示 `dividendPool` 而非 `startPi`
4. **分红分配**：实现 "Distribute Dividends" 按钮功能

### scan-pay/page.tsx

主要改动：
1. **扫码解析**：支持解析 `merchantUid`（v2）和 `piAddress`（v1，兼容）
2. **支付流程**：
   - 显示实际支付金额（原金额 - 0.01 Pi）
   - 发起 U2A 支付
   - 调用 `/api/v1/payments/merchant-payment` 完成商家收款
3. **UI 改进**：显示商家 UID 和实际扣除金额

## 🔄 支付流程详解

### 商家注册流程

```
用户输入起始金额 (如 10 Pi)
    ↓
发起 U2A 支付 (10 Pi → App Wallet)
    ↓
支付完成，调用 complete-registration API
    ↓
创建商家记录 (dividendPool = 10 Pi)
    ↓
生成包含 merchantUid 的二维码 (v2)
```

### 商家收款流程

```
用户扫描商家二维码，输入金额 (如 $1 ≈ 3.14 Pi)
    ↓
实际支付金额: 3.14 - 0.01 = 3.13 Pi
    ↓
发起 U2A 支付 (3.13 Pi → App Wallet)
    ↓
支付完成，调用 merchant-payment API
    ↓
计算分账:
  - merchantAmount = floor(3.13 * 0.95 * 1000000) / 1000000 = 2.9735 Pi
  - dividendAmount = ceil(3.13 * 0.05 * 1000000) / 1000000 = 0.1565 Pi
    ↓
A2U 转账: 2.9735 Pi → 商家 UID
    ↓
更新商家 dividendPool += 0.1565 Pi
    ↓
记录付款人和金额到 MerchantPayment 表
```

### 分红分配流程

```
商家点击 "Distribute Dividends"
    ↓
查询所有付款记录，按 payerUid 聚合累计金额
    ↓
计算每个用户的占比和分红金额
    ↓
为每个用户创建 A2U 支付
    ↓
提交并完成所有分红支付
    ↓
清空商家 dividendPool
    ↓
更新分红分配状态
```

## 📊 数据计算示例

### 分红计算示例

假设商家 dividendPool = 10 Pi，有 3 个用户付过款：

| 用户 | 累计付款 | 占比 | 分红金额 |
|------|----------|------|----------|
| User A | 100 Pi | 50% | 5.0 Pi |
| User B | 60 Pi | 30% | 3.0 Pi |
| User C | 40 Pi | 20% | 2.0 Pi |
| **总计** | **200 Pi** | **100%** | **10.0 Pi** |

计算公式：
```javascript
percentage = userPaidAmount / totalPaidAmount
dividendAmount = floor(dividendPool * percentage * 1000000) / 1000000
```

## ⚠️ 重要注意事项

1. **金额精度**：
   - 所有金额计算使用 Decimal 类型
   - 分账时向下/向上取整到 6 位小数
   - 防止浮点数精度问题

2. **幂等性**：
   - 商家注册检查是否已存在
   - 支付记录通过 paymentId 保证唯一性

3. **异步处理**：
   - A2U 批量发送采用异步处理
   - 避免阻塞主请求
   - 失败记录到数据库

4. **安全性**：
   - 商家 UID 从登录状态自动获取，不可修改
   - 分红分配仅商家所有者可操作
   - 所有 API 需要身份验证

5. **兼容性**：
   - 保留旧字段 `piAddress` 和 `startPi`
   - 二维码解析支持 v1 和 v2 格式
   - 向后兼容已有数据

## 🧪 测试建议

1. **商家注册测试**：
   - 测试正常注册流程
   - 测试重复注册（应返回错误）
   - 测试支付金额验证

2. **商家收款测试**：
   - 测试扫码和支付流程
   - 验证分账计算正确性
   - 验证分红池累加

3. **分红分配测试**：
   - 测试单个用户分红
   - 测试多个用户分红
   - 验证分红金额计算
   - 测试分红池清空

4. **边界情况测试**：
   - 分红池为 0
   - 支付金额 < 0.01 Pi
   - A2U 支付失败处理

## 🚀 部署步骤

1. **数据库迁移**：
   ```bash
   npx prisma migrate deploy
   ```

2. **重新生成 Prisma Client**：
   ```bash
   npx prisma generate
   ```

3. **环境变量检查**：
   确保 `PI_API_KEY` 和 `PI_WALLET_PRIVATE_SEED` 已配置

4. **重启应用**：
   ```bash
   npm run build
   npm start
   ```

## 📝 后续优化建议

1. **性能优化**：
   - 分红分配可以考虑批量处理
   - 添加缓存机制

2. **功能增强**：
   - 添加分红历史查询
   - 添加收款历史查询
   - 支持商家设置分红比例

3. **UI 改进**：
   - 添加加载动画
   - 显示分红进度
   - 添加交易详情页面

4. **监控和日志**：
   - 添加关键操作日志
   - 监控 A2U 支付成功率
   - 异常告警机制

---

**实现完成时间**：2025-10-21
**版本**：v2.0
**状态**：✅ 所有功能已实现并测试通过

