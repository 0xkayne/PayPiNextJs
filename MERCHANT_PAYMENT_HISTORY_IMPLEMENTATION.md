# 商家支付历史功能实现

## 📋 功能概述

为 scan-pay 功能添加了专门的支付历史页面，区别于批量转账历史（/history）。

## 🎯 实现内容

### 1. 后端 API

**文件**: `/app/api/v1/payments/merchant-payment/history/route.ts`

**功能**:
- 获取当前登录用户通过扫码支付给商家的所有记录
- 按时间倒序排列
- 包含完整的交易详情和商家信息

**返回数据结构**:
```typescript
{
  data: [
    {
      id: string,
      merchantUid: string,        // 商家的 UID
      merchantUsername: string,   // 商家的用户名
      totalAmount: number,        // 总支付金额（扣除 0.01 Pi 后）
      merchantAmount: number,     // 商家收到的 95%
      dividendAmount: number,     // 分红池的 5%
      u2aPaymentId: string,      // U2A 支付 ID（用户到 App）
      u2aTxid: string,           // U2A 交易 ID
      a2uPaymentId: string,      // A2U 支付 ID（App 到商家）
      a2uTxid: string,           // A2U 交易 ID
      a2uStatus: string,         // A2U 状态
      a2uErrorMessage: string,   // 错误信息（如果有）
      createdAt: string,         // 创建时间
      completedAt: string,       // 完成时间
    }
  ]
}
```

**查询逻辑**:
```sql
SELECT * FROM MerchantPayment
WHERE payerUid = '当前用户的 Pi UID'
ORDER BY createdAt DESC
```

### 2. 前端页面

**文件**: `/app/merchant-payment-history/page.tsx`

**功能特点**:
- ✅ 显示所有商家支付记录
- ✅ 展示支付给的商家信息（用户名 + UID）
- ✅ 分别显示三个金额：总支付、商家收到、分红贡献
- ✅ 可展开查看详细交易信息
- ✅ 显示 U2A 和 A2U 两个交易的完整详情
- ✅ 实时状态更新
- ✅ 空状态时显示友好提示
- ✅ 与其他页面风格一致

**UI 组件**:
1. **卡片概览**:
   - 商家用户名和 UID
   - 支付状态标识
   - 三列金额显示（总额、商家、分红）
   - 支付时间

2. **展开详情**:
   - U2A 交易详情（用户到 App）
   - A2U 交易详情（App 到商家）
   - 分红池贡献说明
   - 完成时间

3. **空状态**:
   - NoTx 图标
   - 友好的提示文案

### 3. 导航链接更新

**修改**: `/app/scan-pay/page.tsx`
- 将 Payment History 按钮的链接从 `/history` 改为 `/merchant-payment-history`
- 清理未使用的导入和变量

## 🔄 页面关系图

```
主页 (/)
  │
  ├─ Merchant Code (/merchant-code)
  │    └─ (商家注册和分红管理)
  │
  ├─ Scan Pay (/scan-pay)
  │    ├─ Payment History → /merchant-payment-history ✅ 新增
  │    └─ (扫码支付功能)
  │
  ├─ One-to-N (/oneton)
  │    ├─ Transaction History → /history
  │    └─ (批量转账功能)
  │
  └─ Red Envelope (/red-envelope)
       └─ (红包功能)
```

## 📊 数据流程

### 商家支付记录的生成

```
用户在 scan-pay 扫码支付
  ↓
调用 /api/v1/payments/merchant-payment
  ↓
创建 MerchantPayment 记录:
  - payerUid: 用户的 UID
  - merchantPaycodeId: 商家 ID
  - totalAmount: 实际支付金额
  - merchantAmount: 95%
  - dividendAmount: 5%
  - u2aPaymentId, u2aTxid
  - a2uPaymentId, a2uTxid
  - a2uStatus: pending → created → submitted → completed
  ↓
异步处理 A2U 转账给商家
  ↓
更新 a2uStatus 为 completed
```

### 历史记录的查询

```
用户访问 /merchant-payment-history
  ↓
前端调用 /api/v1/payments/merchant-payment/history
  ↓
后端查询:
  - 通过 payerUid 找到所有支付记录
  - 关联查询商家信息
  - 按时间倒序排列
  ↓
返回格式化的数据
  ↓
前端渲染列表
```

## 🎨 UI 展示示例

### 支付记录卡片

```
┌─────────────────────────────────────────────┐
│ Payment to Merchant              Completed  │
│ @john_merchant                              │
│ e0b8b25b-23b0-4849...                       │
│ ─────────────────────────────────────────── │
│ Total paid    To merchant    Dividend       │
│ 3.13 Pi       2.9735 Pi      0.1565 Pi     │
│                                             │
│ 2025-10-21, 14:30                          │
│                                             │
│        View details ▼                       │
└─────────────────────────────────────────────┘
```

### 展开详情

```
┌─────────────────────────────────────────────┐
│ Transaction details:                        │
│                                             │
│ Your Payment (U2A)                          │
│ Payment ID: pi_abc123...                    │
│ Transaction ID: tx_xyz789...                │
│ Amount: 3.13 Pi                             │
│                                             │
│ Transfer to Merchant (A2U)                  │
│ Payment ID: pi_def456...                    │
│ Transaction ID: tx_uvw012...                │
│ Amount: 2.9735 Pi                           │
│ Status: Completed                           │
│                                             │
│ Dividend Pool Contribution                  │
│ 0.1565 Pi                                   │
│ 5% of your payment goes to the merchant's   │
│ dividend pool                               │
│                                             │
│ Completed: 2025-10-21, 14:30:15            │
└─────────────────────────────────────────────┘
```

## ✨ 功能亮点

### 1. 清晰的金额分解
- **总支付**: 用户实际支付的金额（已扣 0.01 Pi）
- **商家收到**: 95% 的金额
- **分红贡献**: 5% 进入商家分红池

### 2. 完整的交易追踪
- **U2A 阶段**: 用户支付到 App wallet
- **A2U 阶段**: App wallet 转账给商家
- 两个阶段都有独立的 paymentId 和 txid

### 3. 状态实时更新
- `pending` - 等待处理
- `created` - A2U 支付已创建
- `submitted` - 已提交到区块链
- `completed` - 转账完成
- `failed` - 转账失败（显示错误信息）

### 4. 商家信息展示
- 商家用户名
- 商家 UID（部分显示）
- 方便用户识别支付去向

## 🧪 测试步骤

### 前置条件
确保已经：
1. ✅ 注册了商家二维码
2. ✅ 通过 scan-pay 完成至少一笔支付

### 测试流程

1. **访问支付历史页面**:
   ```
   打开 scan-pay 页面
     ↓
   点击 "Payment History" 按钮
     ↓
   应该跳转到 /merchant-payment-history
   ```

2. **验证数据显示**:
   - ✅ 显示你之前的支付记录
   - ✅ 商家信息正确
   - ✅ 金额分解正确（总额 = 商家 + 分红）
   - ✅ 时间显示正确

3. **测试展开功能**:
   ```
   点击 "View details"
     ↓
   应该展开显示交易详情
     ↓
   再次点击 "Hide details"
     ↓
   应该收起详情
   ```

4. **测试空状态**:
   - 使用新用户访问（没有支付记录）
   - 应该显示 "No payments yet" 和提示信息

### 测试用例

| 场景 | 预期结果 |
|------|----------|
| 有支付记录 | 显示支付列表，按时间倒序 |
| 无支付记录 | 显示空状态图标和提示 |
| 点击展开 | 显示交易详细信息 |
| A2U 处理中 | 状态显示为 "Pending" 或 "Created" |
| A2U 完成 | 状态显示为 "Completed"，绿色标识 |
| A2U 失败 | 状态显示为 "Failed"，红色标识，显示错误信息 |

## 🔍 数据库查询示例

查看某个用户的所有商家支付：

```sql
SELECT 
  mp.*,
  mc.merchantUid,
  u.username as merchantUsername
FROM "MerchantPayment" mp
JOIN "MerchantPaycode" mc ON mp."merchantPaycodeId" = mc.id
JOIN "PiUser" u ON mc."ownerUserId" = u.id
WHERE mp."payerUid" = 'e0b8b25b-23b0-4849-a5b0-0fc06c94b14d'
ORDER BY mp."createdAt" DESC;
```

## 📝 与批量转账历史的区别

| 特性 | 商家支付历史 | 批量转账历史 |
|------|--------------|--------------|
| 页面路径 | `/merchant-payment-history` | `/history` |
| 入口 | scan-pay 页面 | oneton 页面 |
| 数据来源 | `MerchantPayment` 表 | `BatchTransferTask` 表 |
| 支付类型 | U2A + A2U | U2A + 多个 A2U |
| 金额显示 | 总额、商家、分红 | 总额、每个收款人 |
| 展开详情 | U2A + A2U 交易信息 | U2A + 所有 A2U 列表 |

## 🎯 未来可能的增强

1. **筛选功能**:
   - 按日期范围筛选
   - 按商家筛选
   - 按状态筛选

2. **统计信息**:
   - 总支付金额
   - 总分红贡献
   - 最常支付的商家

3. **搜索功能**:
   - 按商家用户名搜索
   - 按金额范围搜索

4. **导出功能**:
   - 导出为 CSV
   - 生成支付报表

5. **实时更新**:
   - WebSocket 实时推送支付状态
   - 自动刷新未完成的支付

## 📚 相关文件

### 新增文件
- ✅ `/app/api/v1/payments/merchant-payment/history/route.ts` - 后端 API
- ✅ `/app/merchant-payment-history/page.tsx` - 前端页面

### 修改文件
- ✅ `/app/scan-pay/page.tsx` - 更新 Payment History 链接

### 相关文档
- `MERCHANT_PAYMENT_IMPLEMENTATION.md` - 商家支付系统实现
- `INCOMPLETE_PAYMENT_FINAL_FIX.md` - Incomplete payment 修复

## 🚀 使用指南

### 用户流程

1. **进行商家支付**:
   ```
   scan-pay 页面 → 扫描商家二维码 → 输入金额 → 支付
   ```

2. **查看支付历史**:
   ```
   scan-pay 页面 → 点击 "Payment History" → 查看所有支付记录
   ```

3. **查看详细信息**:
   ```
   支付历史页面 → 点击 "View details" → 查看交易详情
   ```

### 数据展示

每条支付记录显示：
- **基本信息**: 商家用户名、UID、支付时间
- **金额信息**: 总支付、商家收到、分红贡献
- **状态信息**: A2U 转账状态（实时更新）
- **交易详情**: 
  - U2A: 你的支付 ID 和交易 ID
  - A2U: 转给商家的支付 ID 和交易 ID
  - 分红池贡献金额

## 💡 设计考虑

### 为什么需要独立的历史页面？

1. **不同的业务逻辑**:
   - 商家支付：单笔支付 → 自动分账 → 转给商家
   - 批量转账：单笔支付 → 多笔转账给不同用户

2. **不同的数据模型**:
   - 商家支付：`MerchantPayment` 表
   - 批量转账：`BatchTransferTask` + `A2UPayment` 表

3. **不同的用户关注点**:
   - 商家支付：关心支付给谁、分账比例、商家收到多少
   - 批量转账：关心每个收款人的状态、总体完成情况

### 为什么不合并到一个页面？

虽然技术上可以合并，但分开有以下好处：
- ✅ 更清晰的用户体验
- ✅ 更简洁的代码逻辑
- ✅ 更容易维护和扩展
- ✅ 减少认知负担

## 🔗 页面导航

### scan-pay 页面的按钮

```tsx
<Link href="/merchant-payment-history">
  Payment History
</Link>
```

### merchant-payment-history 页面的返回

```tsx
<Link href="/scan-pay">
  <BackIcon /> (返回 scan-pay)
</Link>
```

### 底部额外操作

```tsx
<Link href="/scan-pay">
  + Make another payment
</Link>
```

## ✅ 完成检查清单

- ✅ 后端 API 创建完成
- ✅ 前端页面创建完成
- ✅ scan-pay 链接已更新
- ✅ 所有代码通过 lint 检查
- ✅ 与现有 UI 风格一致
- ✅ 支持空状态显示
- ✅ 支持详情展开/收起
- ✅ 包含完整的交易信息

## 📱 截图预览（预期效果）

### 有记录时：
```
┌─────────────────────────────────────┐
│  ← Merchant Payment History         │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Payment to Merchant   Completed │ │
│ │ @alice_shop                     │ │
│ │ e0b8b25b-23b0...                │ │
│ │ ─────────────────────────────── │ │
│ │ Total paid  To merchant Dividend│ │
│ │ 3.13 Pi     2.97 Pi     0.16 Pi │ │
│ │ 2025-10-21, 14:30               │ │
│ │        View details ▼           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Payment to Merchant   Processing│ │
│ │ @bob_store                      │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│      + Make another payment         │
└─────────────────────────────────────┘
```

### 无记录时：
```
┌─────────────────────────────────────┐
│  ← Merchant Payment History         │
├─────────────────────────────────────┤
│                                     │
│         [NoTx Icon]                 │
│                                     │
│      No payments yet                │
│                                     │
│  Your merchant payment records      │
│  will be displayed here             │
│  Start using scan-to-pay feature    │
│                                     │
└─────────────────────────────────────┘
```

## 🎓 技术要点

### 数据关联查询
```typescript
prisma.merchantPayment.findMany({
  where: { payerUid: user.piUid },
  include: {
    merchantPaycode: {
      select: {
        merchantUid: true,
        owner: { select: { username: true } }
      }
    }
  }
});
```

### 金额格式化
```typescript
// 保留 6 位小数
totalAmount.toFixed(6)  // "3.130000"

// 根据需要可以优化为去除尾部 0
Number(totalAmount.toFixed(6))  // 3.13
```

### 时间格式化
```typescript
new Date(createdAt).toLocaleString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
// "10/21/2025, 02:30 PM"
```

---

**实施完成时间**: 2025-10-21  
**版本**: v1.0  
**状态**: ✅ 已完成并可测试

