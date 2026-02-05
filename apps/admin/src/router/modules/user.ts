export default {
  path: "/user",
  meta: {
    icon: "ep:user",
    title: "用户管理",
    rank: 5
  },
  children: [
    {
      path: "/user/list",
      name: "UserList",
      component: () => import("@/views/user/list/index.vue"),
      meta: {
        title: "用户列表",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
