export default {
  path: "/dashboard",
  meta: {
    icon: "ep:data-analysis",
    title: "仪表盘",
    rank: 1
  },
  children: [
    {
      path: "/dashboard",
      name: "Dashboard",
      component: () => import("@/views/dashboard/index.vue"),
      meta: {
        title: "仪表盘",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
