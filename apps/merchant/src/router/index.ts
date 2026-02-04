import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/wallet',
    children: [
      {
        path: 'wallet',
        name: 'Wallet',
        component: () => import('@/views/wallet/index.vue'),
        meta: { title: '钱包', icon: 'Wallet' },
      },
      {
        path: 'topup-order',
        name: 'TopupOrder',
        component: () => import('@/views/order/TopupList.vue'),
        meta: { title: '充值订单', icon: 'Document' },
      },
      {
        path: 'refund-order',
        name: 'RefundOrder',
        component: () => import('@/views/order/RefundList.vue'),
        meta: { title: '退款订单', icon: 'RefreshLeft' },
      },
      {
        path: 'settlement',
        name: 'Settlement',
        component: () => import('@/views/settlement/index.vue'),
        meta: { title: '兑付', icon: 'Money' },
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/config/index.vue'),
        meta: { title: '网关配置', icon: 'Setting' },
      },
      {
        path: 'rate',
        name: 'Rate',
        component: () => import('@/views/config/Rate.vue'),
        meta: { title: '费率查看', icon: 'Discount' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.public) {
    if (authStore.isAuthenticated && to.path === '/login') {
      next('/');
    } else {
      next();
    }
    return;
  }

  if (!authStore.isAuthenticated) {
    next('/login');
    return;
  }

  next();
});

export default router;
