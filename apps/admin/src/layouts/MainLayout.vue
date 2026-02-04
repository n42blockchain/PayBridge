<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="app-sidebar">
      <div class="app-logo">PayBridge Admin</div>
      <el-menu
        :default-active="route.path"
        class="app-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item v-if="!item.hidden" :index="item.path">
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
        <div class="app-breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute?.meta?.title">
              {{ currentRoute.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="app-user">
          <span>{{ authStore.user?.name }}</span>
          <el-dropdown @command="handleCommand">
            <el-avatar :size="32" :icon="UserFilled" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Content -->
      <div class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
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
    .filter((child) => child.meta?.title && !child.meta?.hidden)
    .map((child) => ({
      path: '/' + child.path,
      title: child.meta?.title as string,
      icon: child.meta?.icon as string,
      hidden: child.meta?.hidden as boolean,
    }));
});

const currentRoute = computed(() => {
  return router.currentRoute.value;
});

function handleCommand(command: string) {
  if (command === 'logout') {
    authStore.logout();
    router.push('/login');
  } else if (command === 'profile') {
    // TODO: Navigate to profile page
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
