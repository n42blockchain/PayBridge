<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="app-sidebar">
      <div class="app-logo">商户中心</div>
      <el-menu
        :default-active="route.path"
        class="app-menu"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#fff"
        router
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>

    <!-- Main Content -->
    <main class="app-main">
      <!-- Header -->
      <header class="app-header">
        <div>
          <span class="merchant-name">{{ authStore.user?.merchantName || '商户' }}</span>
        </div>
        <div class="flex items-center gap-4">
          <span>{{ authStore.user?.name }}</span>
          <el-dropdown @command="handleCommand">
            <el-avatar :size="32" :icon="UserFilled" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Content -->
      <div class="app-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UserFilled } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const menuItems = computed(() => {
  const routes = router.getRoutes();
  const mainRoute = routes.find((r) => r.path === '/');
  if (!mainRoute?.children) return [];

  return mainRoute.children
    .filter((child) => child.meta?.title)
    .map((child) => ({
      path: '/' + child.path,
      title: child.meta?.title as string,
      icon: child.meta?.icon as string,
    }));
});

function handleCommand(command: string) {
  if (command === 'logout') {
    authStore.logout();
    router.push('/login');
  }
}
</script>

<style scoped>
.merchant-name {
  font-weight: 500;
  color: #303133;
}
</style>
