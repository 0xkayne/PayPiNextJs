# 商家支付历史功能测试指南

## 🎯 快速测试步骤

### 步骤 1: 准备测试环境

确保你已经：
- ✅ 在 Pi Browser 中登录
- ✅ 已注册商家二维码（在 merchant-code 页面）
- ✅ 已完成至少一笔商家支付（在 scan-pay 页面）

### 步骤 2: 访问商家支付历史页面

1. **从 scan-pay 页面进入**:
   ```
   打开 scan-pay 页面
     ↓
   向下滚动到底部
     ↓
   点击 "Payment History" 按钮（紫橙渐变色）
     ↓
   应该跳转到商家支付历史页面
   ```

2. **直接访问**:
   ```
   在浏览器地址栏输入:
   http://localhost:3000/merchant-payment-history
   ```

### 步骤 3: 验证页面显示

#### 场景 A: 有支付记录

**预期显示**:
```
┌─────────────────────────────────────────┐
│ ← Merchant Payment History              │
├─────────────────────────────────────────┤
│                                         │
│ 每条支付记录应该显示：                      │
│ ✓ 商家用户名（如 @john_merchant）         │
│ ✓ 商家 UID（部分显示）                    │
│ ✓ 三个金额：                              │
│   - Total paid (紫橙渐变色)              │
│   - To merchant (绿色)                   │
│   - Dividend (蓝色)                      │
│ ✓ 支付时间                               │
│ ✓ A2U 状态（Completed/Pending 等）        │
│ ✓ "View details" 按钮                   │
│                                         │
└─────────────────────────────────────────┘
```

#### 场景 B: 无支付记录

**预期显示**:
```
┌─────────────────────────────────────────┐
│ ← Merchant Payment History              │
├─────────────────────────────────────────┤
│                                         │
│         [NoTx SVG 图标]                 │
│                                         │
│       No payments yet                   │
│                                         │
│  Your merchant payment records will     │
│  be displayed here                      │
│  Start using scan-to-pay feature        │
│                                         │
└─────────────────────────────────────────┘
```

### 步骤 4: 测试展开详情功能

1. **点击任意一条记录的 "View details"**:
   - ✅ 应该展开显示详细信息
   - ✅ 按钮文字变为 "Hide details ▲"

2. **验证展开的详情包含**:
   - ✅ **Your Payment (U2A)** 部分:
     - Payment ID
     - Transaction ID
     - Amount
   
   - ✅ **Transfer to Merchant (A2U)** 部分:
     - Payment ID
     - Transaction ID
     - Amount
     - Status (带颜色标识)
     - Error message（如果失败）
   
   - ✅ **Dividend Pool Contribution** 部分:
     - 分红金额
     - 说明文字

   - ✅ **Completed time**（如果已完成）

3. **再次点击 "Hide details"**:
   - ✅ 应该收起详情

### 步骤 5: 验证数据准确性

1. **检查金额计算**:
   ```
   验证公式：
   totalAmount = merchantAmount + dividendAmount
   merchantAmount = floor(totalAmount * 0.95 * 1000000) / 1000000
   dividendAmount = ceil(totalAmount * 0.05 * 1000000) / 1000000
   
   示例：
   如果 totalAmount = 3.13 Pi
   则 merchantAmount = 2.9735 Pi (95%)
   则 dividendAmount = 0.1565 Pi (5%)
   总和 = 3.13 Pi ✓
   ```

2. **检查商家信息**:
   - ✅ 商家用户名应该匹配你支付的商家
   - ✅ 商家 UID 应该正确显示

3. **检查状态**:
   - ✅ 如果 A2U 转账完成，状态应为 "Completed"（绿色）
   - ✅ 如果还在处理，状态应为 "Pending" 或 "Created"（灰色/黄色）

### 步骤 6: 测试导航

1. **返回 scan-pay**:
   ```
   点击左上角的返回箭头
     ↓
   应该回到 scan-pay 页面
   ```

2. **"Make another payment" 链接**（如果有记录）:
   ```
   滚动到底部
     ↓
   点击 "+ Make another payment"
     ↓
   应该跳转到 scan-pay 页面
   ```

## 🐛 常见问题排查

### 问题 1: 页面显示空白

**可能原因**:
- 没有登录
- sessionToken 过期

**解决方法**:
1. 检查控制台日志
2. 刷新页面重新登录
3. 检查 localStorage 中的 sessionToken

### 问题 2: 显示 "No payments yet" 但实际有支付

**可能原因**:
- 用户的 Pi UID 没有正确保存
- 支付记录中的 payerUid 不匹配

**排查方法**:
```javascript
// 在控制台执行
console.log("My UID:", localStorage.getItem("pi_uid"));

// 对比数据库中的记录
// 查询： SELECT * FROM "MerchantPayment" WHERE "payerUid" = '你的 UID';
```

### 问题 3: A2U 状态一直是 "Pending"

**可能原因**:
- 后台 A2U 转账还在处理
- A2U 转账失败但状态未更新

**解决方法**:
1. 等待几分钟后刷新页面
2. 展开详情查看是否有错误信息
3. 检查后端日志

### 问题 4: 金额计算不正确

**检查**:
```javascript
// 验证计算逻辑
const totalAmount = 3.13;
const merchantAmount = Math.floor(totalAmount * 0.95 * 1000000) / 1000000;
const dividendAmount = Math.ceil(totalAmount * 0.05 * 1000000) / 1000000;

console.log({
  totalAmount,
  merchantAmount,  // 应该是 2.9735
  dividendAmount,  // 应该是 0.1565
  sum: merchantAmount + dividendAmount  // 应该等于 totalAmount
});
```

## 🧪 完整测试流程

### 端到端测试

1. **注册商家**（如果还没有）:
   ```
   merchant-code 页面 → 输入起始金额 → Generate → 支付 → 获得二维码
   ```

2. **进行商家支付**:
   ```
   scan-pay 页面 → 扫描二维码 → 输入金额 → Continue to Payment → 完成支付
   ```

3. **查看历史记录**:
   ```
   scan-pay 页面 → Payment History → 查看刚刚的支付记录
   ```

4. **验证数据**:
   ```
   展开详情 → 检查所有字段是否正确
   ```

5. **返回继续支付**:
   ```
   点击返回或 "Make another payment" → 回到 scan-pay 继续使用
   ```

## 📊 预期的控制台日志

### 页面加载时：
```
📝 Getting sessionToken...
✅ sessionToken obtained
📡 Loading merchant payment history...
✅ Loaded merchant payment history: 2 records
```

### 如果出错：
```
❌ Failed to load merchant payment history, status: 401
或
❌ Error loading merchant payment history: Error: ...
```

## 🎉 测试成功的标志

如果一切正常，你应该能够：
- ✅ 看到所有你支付过的商家记录
- ✅ 每条记录显示完整的信息
- ✅ 金额分解正确（95% + 5% = 100%）
- ✅ 展开/收起功能正常
- ✅ 状态颜色正确显示
- ✅ 导航链接工作正常
- ✅ 空状态显示友好

## 📝 下一步

测试完成后，可以继续测试：
1. **商家分红功能**: 在 merchant-code 页面点击 "Distribute Dividends"
2. **批量转账功能**: 在 oneton 页面测试一对多转账
3. **红包功能**: 在 red-envelope 页面测试红包发放

---

**测试指南版本**: v1.0  
**创建时间**: 2025-10-21  
**状态**: 🟢 Ready for Testing

