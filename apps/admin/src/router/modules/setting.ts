export default {
  path: "/setting",
  meta: {
    icon: "ep:setting",
    title: "系统设置",
    rank: 6
  },
  children: [
    {
      path: "/setting/index",
      name: "SystemSetting",
      component: () => import("@/views/setting/index.vue"),
      meta: {
        title: "系统设置",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
