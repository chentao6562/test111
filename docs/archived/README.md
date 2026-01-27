# 归档文档

> 本目录存放已废弃的功能文档，仅供历史参考。

**归档日期**: 2026-01-16
**归档原因**: 系统从锁货模式升级为预约模式

---

## 已归档文档

### logistics/ - 货管端文档

| 文件 | 说明 | 废弃原因 |
|------|------|---------|
| LOGISTICS_MINIPROGRAM_MANUAL.md | 货管端小程序开发手册 | 预约模式不需要货管端 |
| JS-BRIDGE-GUIDE.md | H5-App桥接指南 | 货管端功能已废弃 |

---

## 废弃功能说明

### 货管端 (miniprogram-logistics / h5-logistics)

**原有功能**:
- VIP移库任务接单
- 移库打包抢单
- 客户提货核销
- 收入统计与提现

**废弃原因**:
2026-01-16系统升级为预约模式后，不再需要移库功能。客户通过线上预约后直接到门店付款提货，由门店员工（原库管）负责核销，无需货管参与。

### 锁货/移库相关功能

**废弃的数据模型**:
- `TransferBundle` - 移库打包
- `TransferConfig` - 撮合配置
- `TransferTask` - 移库任务（代码保留用于历史数据）
- `DeliveryPool` - 配送抢单池

**废弃的API端点**:
- `/api/staff/delivery-*` - 货管配送
- `/api/staff/transfer-*` - 移库任务
- `/api/admin/transfer/*` - 移库管理
- `/api/staff/logistics/*` - 货管核销

---

## 注意事项

1. 这些文档仅供历史参考，不再维护更新
2. 相关代码可能仍保留在代码库中用于历史数据兼容
3. 新开发功能请参考最新的开发手册

---

## 当前有效文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 门店端手册 | `docs/store/STORE-GUIDE.md` | 门店端（原库管端）开发指南 |
| 客户端手册 | `docs/agent/AGENT_MINIPROGRAM_MANUAL.md` | 代理商/客户端开发指南 |
| 管理后台手册 | `docs/admin/ADMIN-GUIDE.md` | 管理后台开发指南 |
| 预约系统指南 | `docs/global/RESERVATION-GUIDE.md` | 预约业务完整指南 |

---

*归档操作由 Claude AI 执行*
