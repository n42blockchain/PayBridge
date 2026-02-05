<template>
  <div class="welcome-container">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-700 mb-4">
        欢迎使用 PayBridge Admin
      </h1>
      <p class="text-gray-500 mb-8">
        区块链支付桥接系统管理后台
      </p>
      <el-button type="primary" size="large" @click="$router.push('/dashboard')">
        进入仪表盘
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "Welcome"
});
</script>

<style lang="scss" scoped>
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
}
</style>
