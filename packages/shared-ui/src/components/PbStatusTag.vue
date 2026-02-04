<template>
  <el-tag :type="tagType" :size="size" :effect="effect">
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTag } from 'element-plus';

const props = withDefaults(
  defineProps<{
    status: string;
    statusMap?: Record<string, { label: string; type: string }>;
    size?: 'large' | 'default' | 'small';
    effect?: 'dark' | 'light' | 'plain';
  }>(),
  {
    size: 'default',
    effect: 'light',
  },
);

// Default status mappings
const defaultStatusMap: Record<string, { label: string; type: string }> = {
  // Common
  ENABLED: { label: '启用', type: 'success' },
  DISABLED: { label: '禁用', type: 'danger' },
  ACTIVE: { label: '活跃', type: 'success' },
  INACTIVE: { label: '未激活', type: 'info' },
  LOCKED: { label: '锁定', type: 'danger' },
  FROZEN: { label: '冻结', type: 'warning' },

  // Order status
  PENDING: { label: '待处理', type: 'warning' },
  PAYING: { label: '支付中', type: 'primary' },
  PAID: { label: '已支付', type: 'success' },
  SUCCESS: { label: '成功', type: 'success' },
  FAILED: { label: '失败', type: 'danger' },
  CLOSED: { label: '已关闭', type: 'info' },
  REFUNDED: { label: '已退款', type: 'warning' },
  PROCESSING: { label: '处理中', type: 'primary' },
  REJECTED: { label: '已拒绝', type: 'danger' },

  // Settlement
  PENDING_AUDIT: { label: '待审核', type: 'warning' },
  AUDITING: { label: '审核中', type: 'primary' },
  APPROVED: { label: '已批准', type: 'success' },
  SETTLING: { label: '兑付中', type: 'primary' },

  // Environment
  TEST: { label: '测试', type: 'warning' },
  PRODUCTION: { label: '生产', type: 'success' },
};

const statusConfig = computed(() => {
  const map = props.statusMap || defaultStatusMap;
  return map[props.status] || { label: props.status, type: 'info' };
});

const tagType = computed(() => statusConfig.value.type as any);
const label = computed(() => statusConfig.value.label);
</script>
