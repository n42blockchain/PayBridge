<template>
  <el-tag :type="statusConfig.type" :effect="effect" :size="size">
    <el-icon v-if="statusConfig.icon" class="status-icon">
      <component :is="statusConfig.icon" />
    </el-icon>
    {{ statusConfig.label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed, Component } from 'vue';
import { ElTag, ElIcon } from 'element-plus';
import {
  Clock,
  Loading,
  CircleCheck,
  CircleClose,
  Warning,
  RefreshRight,
  Document,
} from '@element-plus/icons-vue';
import type { TopupOrderStatus, SettlementOrderStatus, RefundStatus } from '@paybridge/shared-types';

const props = withDefaults(
  defineProps<{
    status: TopupOrderStatus | SettlementOrderStatus | RefundStatus | string;
    orderType?: 'topup' | 'settlement' | 'refund';
    size?: 'large' | 'default' | 'small';
    effect?: 'dark' | 'light' | 'plain';
    showIcon?: boolean;
  }>(),
  {
    orderType: 'topup',
    size: 'default',
    effect: 'light',
    showIcon: true,
  },
);

interface StatusConfig {
  label: string;
  type: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  icon?: Component;
}

const statusConfigs: Record<string, StatusConfig> = {
  // Topup Order Status
  PENDING: { label: '待支付', type: 'warning', icon: Clock },
  PAYING: { label: '支付中', type: 'primary', icon: Loading },
  PAID: { label: '已支付', type: 'success', icon: CircleCheck },
  SUCCESS: { label: '成功', type: 'success', icon: CircleCheck },
  FAILED: { label: '失败', type: 'danger', icon: CircleClose },
  CLOSED: { label: '已关闭', type: 'info', icon: CircleClose },
  REFUNDED: { label: '已退款', type: 'warning', icon: RefreshRight },

  // Settlement Order Status
  PENDING_AUDIT: { label: '待审核', type: 'warning', icon: Document },
  AUDITING: { label: '审核中', type: 'primary', icon: Loading },
  APPROVED: { label: '已批准', type: 'success', icon: CircleCheck },
  REJECTED: { label: '已拒绝', type: 'danger', icon: CircleClose },
  SETTLING: { label: '兑付中', type: 'primary', icon: Loading },

  // Refund Status
  PROCESSING: { label: '处理中', type: 'primary', icon: Loading },
};

const statusConfig = computed<StatusConfig>(() => {
  const config = statusConfigs[props.status];
  if (config) {
    return props.showIcon ? config : { ...config, icon: undefined };
  }
  return { label: props.status, type: 'info' };
});
</script>

<style scoped>
.status-icon {
  margin-right: 4px;
  vertical-align: -2px;
}
</style>
