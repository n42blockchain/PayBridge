export default {
  path: "/topup",
  meta: {
    icon: "ep:wallet",
    title: "充值管理",
    rank: 3
  },
  children: [
    {
      path: "/topup/order",
      name: "TopupOrder",
      component: () => import("@/views/topup/order/index.vue"),
      meta: {
        title: "充值订单"
      }
    },
    {
      path: "/topup/channel",
      name: "TopupChannel",
      component: () => import("@/views/topup/channel/index.vue"),
      meta: {
        title: "充值渠道"
      }
    }
  ]
} satisfies RouteConfigsTable;
