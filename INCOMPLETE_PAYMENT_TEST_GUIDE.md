# Incomplete Payment 修复测试指南

## 🎯 立即测试步骤

### 步骤 1: 刷新页面
```
1. 在 Pi Browser 中刷新当前页面（merchant-code）
2. 打开浏览器开发者工具（如果可以）
3. 查看 Console 标签
```

**预期结果 A - 自动修复成功**：
```
控制台输出：
✓ "Found incomplete payment:" {...}
✓ "Checking incomplete payment:" {...}
✓ "Attempting to complete incomplete merchant registration payment"
✓ "Successfully completed incomplete payment"

界面显示：
✓ 商家二维码自动显示
✓ 显示分红池金额（0.05 Pi）
✓ 不再显示任何错误
```

**预期结果 B - 需要手动修复**：
```
控制台输出：
✓ "Found incomplete payment:" {...}
✓ "Checking incomplete payment:" {...}
⚠ "Failed to complete incomplete payment:" {...}

界面显示：
⚠ 错误消息："Failed to complete previous payment: ..."
→ 继续步骤 2
```

### 步骤 2: 使用 Try Auto-Fix（如果步骤 1 失败）

```
1. 点击页面上的 "Generate" 按钮
2. 应该会弹出一个帮助对话框
3. 点击对话框中的 "Try Auto-Fix" 按钮
4. 等待几秒钟
```

**预期结果 A - 修复成功**：
```
界面显示：
✓ 显示 alert: "Successfully completed the incomplete payment!"
✓ 对话框自动关闭
✓ 商家二维码显示
✓ 可以正常使用
```

**预期结果 B - 仍然失败**：
```
界面显示：
⚠ 错误消息："Auto-fix failed: ..."
→ 继续步骤 3
```

### 步骤 3: 等待并刷新（如果步骤 2 失败）

```
1. 关闭帮助对话框
2. 等待 5-10 分钟
3. 刷新页面
4. 重复步骤 1
```

**原因**：
- Pi Network 的区块链确认需要时间
- 支付状态可能还在同步中
- 等待让系统有时间完成后台处理

## 🔍 如何查看控制台日志（可选）

### 在移动设备上（Pi Browser）

如果 Pi Browser 支持，可以尝试：
1. 在 URL 栏输入 `chrome://inspect` 或 `about:inspect`
2. 或者使用远程调试（需要 USB 连接电脑）

### 替代方案

如果无法查看控制台，只需：
1. 按照界面提示操作
2. 如果看到二维码 = 成功
3. 如果看到错误消息 = 等待并重试

## 🐛 调试检查清单

如果问题持续存在，请检查：

### 1. 检查 localStorage 中的数据

在浏览器控制台执行：
```javascript
// 查看未完成支付的信息
console.log(localStorage.getItem("pi_incomplete_payment"));

// 查看所有相关数据
console.log({
  sessionToken: localStorage.getItem("sessionToken"),
  pi_uid: localStorage.getItem("pi_uid"),
  pi_username: localStorage.getItem("pi_username"),
  pi_incomplete_payment: localStorage.getItem("pi_incomplete_payment")
});
```

### 2. 手动清除未完成支付标记（最后手段）

**警告**：只有在确认支付已经失败且无法恢复时才使用！

```javascript
// 清除未完成支付标记
localStorage.removeItem("pi_incomplete_payment");

// 然后刷新页面
window.location.reload();
```

### 3. 检查后端 API

确认后端 API 正常运行：

```javascript
// 测试 complete-registration API（需要替换实际的 paymentId、txid、sessionToken）
fetch('/api/v1/merchant-code/complete-registration', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SESSION_TOKEN'
  },
  body: JSON.stringify({
    paymentId: 'PAYMENT_ID',
    txid: 'TXID',
    startPi: 0.05
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 📊 常见问题 FAQ

### Q1: 为什么自动修复失败？
**A**: 可能的原因：
- 支付还在区块链确认中（需要等待）
- 支付 ID 或 txid 不匹配
- 网络问题
- 后端 API 配置问题

### Q2: 如何知道支付是否真的提交到区块链了？
**A**: 检查 localStorage 中的 incomplete payment 对象：
```javascript
const payment = JSON.parse(localStorage.getItem("pi_incomplete_payment"));
console.log("Has txid:", !!payment.transaction?.txid);
```
如果有 txid = 已提交到区块链

### Q3: 等待多久才算太久？
**A**: 
- 正常情况：1-2 分钟
- 网络慢：5-10 分钟
- 超过 15 分钟：可能有其他问题，建议联系支持

### Q4: 我可以直接删除 localStorage 数据吗？
**A**: 
- **不推荐**：如果支付已经提交到区块链，删除数据会导致无法完成支付
- **但是**：如果确认支付已经失败且无法恢复，可以删除
- **更好的方式**：使用 "Try Auto-Fix" 功能

### Q5: 修复后会扣我两次费用吗？
**A**: 
- **不会**：系统通过 paymentId 确保幂等性
- 同一个 paymentId 只会完成一次
- 数据库中也有检查防止重复注册

## 🎉 预期成功的迹象

当一切正常工作时，你应该看到：

1. **页面刷新后**：
   - ✅ 自动显示 "Completing previous incomplete payment..."
   - ✅ 几秒后商家二维码出现
   - ✅ 显示分红池金额
   - ✅ 没有错误消息

2. **控制台日志**（如果能查看）：
   - ✅ "Found incomplete payment"
   - ✅ "Successfully completed incomplete payment"
   - ✅ 没有错误日志

3. **功能状态**：
   - ✅ 可以复制 UID
   - ✅ 可以复制分红金额
   - ✅ "Distribute Dividends" 按钮可用

## 📞 如果所有方案都失败

如果尝试了所有方案后仍然失败：

1. **收集信息**：
   - 截图错误消息
   - 复制控制台日志（如果可以）
   - 记录等待的时间

2. **检查数据库**：
   ```sql
   -- 查看是否已经创建了商家记录
   SELECT * FROM "MerchantPaycode" WHERE "ownerUserId" = 'YOUR_USER_ID';
   ```

3. **查看后端日志**：
   - 检查终端中的 API 调用日志
   - 查找相关的错误消息

4. **联系支持**或在项目 issue 中报告问题

---

**最后更新**: 2025-10-21  
**适用版本**: v3.0  
**状态**: 🟢 Ready for Testing

