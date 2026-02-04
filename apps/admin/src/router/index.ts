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
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Odometer' },
      },
      {
        path: 'merchant',
        name: 'MerchantList',
        component: () => import('@/views/merchant/List.vue'),
        meta: { title: '商户管理', icon: 'Shop' },
      },
      {
        path: 'merchant/:id',
        name: 'MerchantDetail',
        component: () => import('@/views/merchant/Detail.vue'),
        meta: { title: '商户详情', hidden: true },
      },
      {
        path: 'topup-channel',
        name: 'TopupChannelList',
        component: () => import('@/views/topup/ChannelList.vue'),
        meta: { title: '充值渠道', icon: 'Wallet' },
      },
      {
        path: 'topup-order',
        name: 'TopupOrderList',
        component: () => import('@/views/topup/OrderList.vue'),
        meta: { title: '充值订单', icon: 'Document' },
      },
      {
        path: 'settlement-channel',
        name: 'SettlementChannelList',
        component: () => import('@/views/settlement/ChannelList.vue'),
        meta: { title: '兑付渠道', icon: 'CreditCard' },
      },
      {
        path: 'settlement-order',
        name: 'SettlementOrderList',
        component: () => import('@/views/settlement/OrderList.vue'),
        meta: { title: '兑付订单', icon: 'Files' },
      },
      {
        path: 'user',
        name: 'UserList',
        component: () => import('@/views/user/List.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'setting',
        name: 'Setting',
        component: () => import('@/views/setting/index.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
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
