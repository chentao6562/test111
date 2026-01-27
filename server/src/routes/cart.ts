import { Router } from 'express';
import {
  getCartList,
  getCartCount,
  addToCart,
  updateCartItem,
  removeFromCart,
  batchDelete,
  clearCart,
  updateSelection,
  selectAll,
} from '../controllers/cartController';
import { authAgent } from '../middlewares/auth';

const router = Router();

// 获取购物车列表
router.get('/', authAgent, getCartList);

// 获取购物车数量
router.get('/count', authAgent, getCartCount);

// 添加商品到购物车
router.post('/', authAgent, addToCart);

// 批量删除（放在 /:id 之前，避免被路由覆盖）
router.post('/batch-delete', authAgent, batchDelete);

// 全选/取消全选
router.put('/select-all', authAgent, selectAll);

// 更新购物车商品数量
router.put('/:id', authAgent, updateCartItem);

// 更新选中状态
router.put('/:id/select', authAgent, updateSelection);

// 删除购物车商品
router.delete('/:id', authAgent, removeFromCart);

// 清空购物车（注意：这个放在最后，因为路径是 /）
// 使用 POST /clear 而不是 DELETE / 避免冲突
router.post('/clear', authAgent, clearCart);

export default router;
