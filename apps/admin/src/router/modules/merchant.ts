export default {
  path: "/merchant",
  meta: {
    icon: "ep:shop",
    title: "商户管理",
    rank: 2
  },
  children: [
    {
      path: "/merchant/list",
      name: "MerchantList",
      component: () => import("@/views/merchant/list/index.vue"),
      meta: {
        title: "商户列表"
      }
    },
    {
      path: "/merchant/detail/:id",
      name: "MerchantDetail",
      component: () => import("@/views/merchant/detail/index.vue"),
      meta: {
        title: "商户详情",
        showLink: false,
        activePath: "/merchant/list"
      }
    }
  ]
} satisfies RouteConfigsTable;
