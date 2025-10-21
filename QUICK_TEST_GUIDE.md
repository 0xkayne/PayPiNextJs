# 🧪 口令红包功能 - 快速测试指南

## 问题已修复 ✅

**问题**: `Invalid or expired token` 错误  
**原因**: Hook使用了localStorage中过期的token  
**修复**: 改为每次都获取fresh token

---

## 🚀 快速测试步骤

### 1. 清理旧数据（推荐）

在浏览器控制台执行：
```javascript
// 清除可能存在的过期token
localStorage.removeItem("sessionToken");
console.log("✅ 已清除旧token");

// 或者清除所有数据（会退出登录）
// localStorage.clear();
```

### 2. 刷新页面

```javascript
location.reload();
```

### 3. 测试口令红包功能

1. **确认登录状态**
   - 在Pi Browser中打开应用
   - 确保已完成Pi认证

2. **进入红包页面**
   - 点击导航到 "Password Gifts"

3. **创建红包**
   - 点击 "Send Password Gifts"
   - 输入金额（如：0.1）
   - 选择持续时间（如：1 Hours）
   - 点击 "Generate Password Gift"

4. **预期结果** ✅
   - 控制台显示: `📝 Obtaining fresh sessionToken from backend...`
   - 控制台显示: `✅ Fresh sessionToken obtained and saved`
   - **不再出现** `Invalid or expired token` 错误
   - 页面显示生成的口令

---

## 🔍 调试检查

如果还有问题，检查以下内容：

### 检查1: Pi认证信息
```javascript
console.log({
  pi_accessToken: localStorage.getItem("pi_accessToken")?.substring(0, 20) + "...",
  pi_username: localStorage.getItem("pi_username"),
  pi_uid: localStorage.getItem("pi_uid")
});

// 应该看到有效的值，不是 null
```

### 检查2: SessionToken获取
```javascript
// 打开浏览器开发者工具 → Network 标签
// 刷新页面
// 查找 "pi-login" 请求
// 查看响应，应该包含 sessionToken
```

### 检查3: 数据库连接
```javascript
// 如果pi-login接口返回错误
// 检查后端控制台日志
// 确保数据库连接正常
```

---

## ✅ 成功标志

当你看到以下内容时，说明一切正常：

### 控制台日志
```
📝 Obtaining fresh sessionToken from backend...
✅ Fresh sessionToken obtained and saved
```

### 红包创建成功
```
界面显示：
┌─────────────────────────────┐
│ Password Code:              │
│ abc123def456...             │
│ 请分享这个口令给朋友...      │
└─────────────────────────────┘
```

---

## 🆘 常见问题

### Q1: 还是显示 "Invalid or expired token"
**A**: 
1. 确保已刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
2. 清除浏览器缓存
3. 检查是否在Pi Browser中打开
4. 查看控制台是否有其他错误

### Q2: 提示 "Missing Pi authentication data"
**A**:
1. 需要在Pi Browser中打开
2. 确保已完成Pi登录认证
3. 检查localStorage是否有pi_accessToken

### Q3: 页面一直显示 "Loading session..."
**A**:
1. 检查网络连接
2. 查看控制台错误信息
3. 确认后端服务正在运行
4. 检查数据库连接

---

## 📊 性能说明

### 加载时间
- 首次获取token: ~100-200ms
- 这是正常的，在可接受范围内

### 每次都获取新token？
- ✅ 是的，这是设计如此
- ✅ 确保token始终有效
- ✅ 避免过期token问题
- ✅ 性能影响可忽略

---

## 🎉 预期体验

### 正常流程
```
1. 打开应用
   ↓
2. 自动获取新token（~100ms）
   ↓
3. 进入红包页面
   ↓
4. 填写金额和时长
   ↓
5. 点击生成按钮
   ↓
6. ✅ 成功创建红包
```

### 整个流程应该很流畅，无卡顿！

---

## 📝 技术细节

如需了解详细的技术实现，请查看：
- `TOKEN_EXPIRY_FIX.md` - 问题分析和修复方案
- `TOKEN_FIX_SUMMARY.md` - 第一次token修复的详情
- `FIX_COMPLETED.md` - 完整修复报告

---

## ✅ 测试清单

- [ ] 清除旧token
- [ ] 刷新页面
- [ ] 确认已登录
- [ ] 进入红包页面
- [ ] 填写金额和时长
- [ ] 点击生成按钮
- [ ] **验证：不再出现 "Invalid or expired token"**
- [ ] **验证：成功显示口令**

---

**准备好了吗？开始测试吧！** 🚀

如有任何问题，请查看控制台日志或联系开发团队。

