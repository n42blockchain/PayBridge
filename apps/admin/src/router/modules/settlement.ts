export default {
  path: "/settlement",
  meta: {
    icon: "ep:coin",
    title: "兑付管理",
    rank: 4
  },
  children: [
    {
      path: "/settlement/order",
      name: "SettlementOrder",
      component: () => import("@/views/settlement/order/index.vue"),
      meta: {
        title: "兑付订单"
      }
    },
    {
      path: "/settlement/channel",
      name: "SettlementChannel",
      component: () => import("@/views/settlement/channel/index.vue"),
      meta: {
        title: "兑付渠道"
      }
    }
  ]
} satisfies RouteConfigsTable;
