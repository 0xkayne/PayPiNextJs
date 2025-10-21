# P0 致命级问题修复 - 迁移指南

## ✅ 已完成的代码修改

所有代码修改已完成！以下是修改的文件：

### 1. 数据库 Schema
- ✅ `prisma/schema.prisma` - 添加了 `piUid` 字段

### 2. 前端代码
- ✅ `app/merchant-code/page.tsx` - 传递 uid 到后端

### 3. 后端代码
- ✅ `app/api/v1/auth/pi-login/route.ts` - 接收并保存 uid
- ✅ `app/api/v1/payments/complete/route.ts` - 使用 piUid 进行 A2U 支付，添加任务持久化

---

## 🚀 下一步：运行数据库迁移

### 方式 1: 手动运行迁移（推荐）

```bash
# 在项目根目录执行
npx prisma migrate dev --name add_pi_uid
```

当提示确认时，输入 `y` 并回车。

### 方式 2: 如果已有数据库数据

如果数据库中已有用户数据，迁移可能会失败（因为 piUid 是 unique 但现有数据都是 null）。

**解决方案**：
```bash
# 1. 先手动将 piUid 设置为可选且非 unique 的字段（已经是这样）
# 2. 运行迁移
npx prisma migrate dev --name add_pi_uid

# 3. 如果迁移成功，所有现有用户需要重新登录以获取 piUid
```

---

## 📋 验证步骤

### 1. 检查迁移是否成功
```bash
npx prisma studio
```
在 Prisma Studio 中检查 `PiUser` 表是否有 `piUid` 列。

### 2. 重启开发服务器
```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev
```

### 3. 测试登录
1. 在 Pi Browser 中打开应用
2. 退出登录（如果已登录）
3. 重新登录
4. 在 Prisma Studio 中查看用户记录，确认 `piUid` 有值

### 4. 测试批量转账
1. 确保所有测试收款人都已登录过（有 piUid）
2. 在 `/oneton` 页面发起测试转账
3. 检查控制台日志，确认使用了正确的 piUid

---

## ⚠️ 重要提示

### 现有用户处理
- **所有现有用户的 `piUid` 初始值为 `null`**
- **他们需要重新登录一次**，系统才能获取并保存他们的 `piUid`
- **在 `piUid` 为 `null` 的情况下，他们不能作为批量转账的收款人**

### 错误信息
如果批量转账时收款人没有 `piUid`，会显示错误：
```
User has no Pi uid: [地址]
```

此时需要通知该用户重新登录。

---

## 🧪 测试清单

完成迁移后，请验证：

- [ ] 数据库迁移成功，`PiUser` 表有 `piUid` 列
- [ ] Prisma Client 已重新生成
- [ ] 开发服务器已重启
- [ ] 新用户登录后 `piUid` 有值
- [ ] 老用户重新登录后 `piUid` 更新
- [ ] 批量转账使用正确的 `piUid`（检查日志）
- [ ] A2U 支付能够成功创建

---

## 🔍 故障排查

### 问题 1: TypeScript 报错 "piUid 不存在"
**原因**: TypeScript 服务器缓存

**解决**:
1. 在 VS Code 中按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows)
2. 输入 "TypeScript: Restart TS Server"
3. 回车

### 问题 2: 迁移失败 "unique constraint"
**原因**: 数据库中已有重复的 null 值

**解决**:
```sql
-- 这不是问题，因为 piUid 允许 null
-- 如果真的有问题，手动检查数据库
```

### 问题 3: 用户登录后仍然没有 piUid
**原因**: 前端没有传递 uid

**解决**:
1. 检查浏览器控制台，确认 `localStorage.getItem("pi_uid")` 有值
2. 检查网络请求，确认登录请求的 body 包含 `uid` 字段
3. 检查后端日志，确认接收到 uid

---

## 📞 需要帮助？

如果遇到问题：
1. 检查控制台日志
2. 使用 Prisma Studio 检查数据库
3. 查看网络请求确认数据传递
4. 参考上面的故障排查章节

---

**修改完成时间**: 2025-10-21  
**修改文件数**: 4 个  
**关键代码行数**: ~35 行  
**状态**: ✅ 代码已修改，等待数据库迁移

