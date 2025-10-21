# Token认证问题修复总结

## 🔍 问题描述

在测试口令红包功能时，点击 `Generate Password Gift` 按钮后出现 `Unauthorized` 错误。

## 🎯 问题根本原因

### 1. Token命名不一致
多个页面使用了**不存在**的 localStorage 键 `paypi_token`：
- `app/red-envelope/page.tsx` 
- `app/transfer/page.tsx`
- `app/batch/page.tsx`

### 2. 缺少后端Session Token获取步骤

系统中存在两套Token：
- **`pi_accessToken`**: Pi Network SDK提供的访问令牌（存在 localStorage）
- **`sessionToken`**: 后端生成的会话令牌（需要通过API获取）

所有后端API的 `requireAuth` 函数需要验证的是 **后端的sessionToken**，而不是Pi的accessToken。

### 3. 正确的认证流程

```
1. 用户通过Pi Browser登录 → 获得 pi_accessToken
2. 调用 /api/v1/auth/pi-login (带上 pi_accessToken) → 获得 sessionToken
3. 使用 sessionToken 调用其他后端API
```

## ✅ 修复方案

### 1. 创建通用Hook (`app/hooks/useSessionToken.ts`)

创建了一个可复用的React Hook来统一管理sessionToken的获取：

**功能特性**：
- ✅ 自动从localStorage获取已存在的token
- ✅ 如果不存在，自动调用后端登录接口获取
- ✅ 统一的加载状态管理
- ✅ 统一的错误处理
- ✅ 自动缓存到localStorage

**使用方式**：
```typescript
const { sessionToken, isLoading, error } = useSessionToken(isAuthenticated);
```

### 2. 修复的页面

#### ✅ `app/red-envelope/page.tsx`
- 引入 `useSessionToken` hook
- 替换错误的 `paypi_token` 为正确的 `sessionToken`
- 添加 token 加载状态显示
- 添加 token 错误处理

#### ✅ `app/transfer/page.tsx`
- 引入 `useSessionToken` hook
- 替换错误的 `paypi_token` 为正确的 `sessionToken`
- 添加 token 加载状态显示
- 添加 token 错误处理

#### ✅ `app/batch/page.tsx`
- 引入 `useSessionToken` hook
- 替换错误的 `paypi_token` 为正确的 `sessionToken`
- 添加 token 加载状态显示
- 添加 token 错误处理

## 📋 修复详情

### Before (错误的方式)
```typescript
const token = typeof window !== "undefined" 
  ? localStorage.getItem("paypi_token") || "" 
  : "";
```

### After (正确的方式)
```typescript
import { useSessionToken } from "../hooks/useSessionToken";

const { sessionToken: token, isLoading: tokenLoading, error: tokenError } = 
  useSessionToken(isAuthenticated);

// 添加加载状态
if (isChecking || tokenLoading) {
  return <LoadingScreen />;
}

// 添加错误处理
if (tokenError) {
  return <ErrorScreen error={tokenError} />;
}
```

## 🔐 认证流程图

```
┌─────────────────────────────────────────────────────────────┐
│  1. 用户在Pi Browser中打开应用                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. AuthContext 调用 Pi.authenticate()                       │
│     保存 pi_accessToken 到 localStorage                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. useSessionToken Hook 自动执行:                          │
│     a. 检查 localStorage 是否已有 sessionToken              │
│     b. 如果没有，调用 /api/v1/auth/pi-login                 │
│        发送: pi_accessToken, username, uid                  │
│     c. 后端验证并创建Session记录                            │
│     d. 返回 sessionToken 并保存到 localStorage              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 页面组件使用 sessionToken 调用后端API                   │
│     headers: { authorization: `Bearer ${sessionToken}` }    │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 测试建议

### 1. 清除缓存测试
```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

### 2. 验证Token获取流程
```javascript
// 检查Pi认证信息
console.log("pi_accessToken:", localStorage.getItem("pi_accessToken"));
console.log("pi_username:", localStorage.getItem("pi_username"));
console.log("pi_uid:", localStorage.getItem("pi_uid"));

// 检查Session Token
console.log("sessionToken:", localStorage.getItem("sessionToken"));
```

### 3. 手动测试Token获取
```javascript
const piAccessToken = localStorage.getItem("pi_accessToken");
const piUsername = localStorage.getItem("pi_username");
const piUid = localStorage.getItem("pi_uid");

fetch("/api/v1/auth/pi-login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    piAccessToken,
    username: piUsername,
    uid: piUid
  }),
})
.then(r => r.json())
.then(console.log);
```

## 📝 文件变更列表

### 新增文件
- ✅ `app/hooks/useSessionToken.ts` - Session Token管理Hook

### 修改文件
- ✅ `app/red-envelope/page.tsx` - 修复token获取逻辑
- ✅ `app/transfer/page.tsx` - 修复token获取逻辑
- ✅ `app/batch/page.tsx` - 修复token获取逻辑

### 未修改但正常的文件
以下文件已经使用了正确的token获取方式：
- `app/history/page.tsx` - 已正确使用sessionToken
- `app/merchant-code/page.tsx` - 已正确使用sessionToken
- `app/scan-pay/page.tsx` - 使用pi_accessToken（正确，因为调用Pi SDK）
- `app/oneton/page.tsx` - 使用pi_accessToken（正确，因为调用Pi SDK）

## ⚠️ 注意事项

1. **Token有效期**: sessionToken默认有效期为7天（在 `/api/v1/auth/pi-login/route.ts` 中定义）

2. **自动刷新**: 如果sessionToken过期，useSessionToken会自动重新获取

3. **错误处理**: 所有修复的页面现在都会正确显示token获取失败的错误信息

4. **Pi Browser依赖**: 某些功能仍需要在Pi Browser中运行（如支付功能）

## 🚀 部署检查清单

- [x] 创建 useSessionToken Hook
- [x] 修复 red-envelope 页面
- [x] 修复 transfer 页面
- [x] 修复 batch 页面
- [x] 所有修改通过 ESLint 检查
- [x] 添加完善的加载状态
- [x] 添加完善的错误处理

## 📊 影响范围

### 修复的功能
- ✅ 口令红包创建
- ✅ 口令红包领取
- ✅ 口令红包查询
- ✅ 单笔转账
- ✅ 批量转账

### 不受影响的功能
以下功能已经正确实现，不受此次修复影响：
- ✅ 用户登录/认证
- ✅ Pi支付（扫码支付、1对N转账等）
- ✅ 历史记录查询
- ✅ 商户码生成

## 🎉 修复结果

所有使用 `paypi_token` 的页面已修复为使用正确的 `sessionToken`。现在应该可以正常使用口令红包功能了！

测试步骤：
1. 在Pi Browser中打开应用
2. 确保已登录
3. 进入红包页面
4. 点击 "Send Password Gifts"
5. 输入金额和时长
6. 点击 "Generate Password Gift"
7. 应该能够成功创建红包并显示口令

---

**修复完成时间**: 2025-10-21  
**修复文件数**: 4个（1个新增 + 3个修改）  
**代码质量**: 所有文件通过ESLint检查

