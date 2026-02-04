<template>
  <el-button
    :type="type"
    :size="size"
    :circle="circle"
    :icon="copied ? Check : CopyDocument"
    @click="handleCopy"
  >
    <slot v-if="!circle">{{ copied ? '已复制' : '复制' }}</slot>
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import { CopyDocument, Check } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    text: string;
    type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';
    size?: 'large' | 'default' | 'small';
    circle?: boolean;
    successMessage?: string;
  }>(),
  {
    type: 'default',
    size: 'small',
    circle: true,
    successMessage: '已复制到剪贴板',
  },
);

const copied = ref(false);

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.text);
    copied.value = true;
    ElMessage.success(props.successMessage);
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    ElMessage.error('复制失败');
  }
}
</script>
