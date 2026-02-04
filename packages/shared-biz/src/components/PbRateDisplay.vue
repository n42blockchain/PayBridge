<template>
  <div class="pb-rate-display">
    <span class="rate-text">{{ formattedRate }}</span>
    <el-tooltip v-if="showTooltip" placement="top">
      <template #content>
        <div class="rate-tooltip">
          <p>费率公式：金额 × {{ percentageDisplay }}% + {{ fixedFee }}</p>
          <p>最低收费：{{ minimumFee }}</p>
          <p v-if="chargeMode">收费方式：{{ chargeModeText }}</p>
        </div>
      </template>
      <el-icon class="info-icon"><InfoFilled /></el-icon>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTooltip, ElIcon } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
import type { FeeChargeMode } from '@paybridge/shared-types';

const props = withDefaults(
  defineProps<{
    percentageFee: string | number;
    fixedFee: string | number;
    minimumFee: string | number;
    chargeMode?: FeeChargeMode;
    showTooltip?: boolean;
  }>(),
  {
    showTooltip: true,
  },
);

const percentageDisplay = computed(() => {
  const val = typeof props.percentageFee === 'string'
    ? parseFloat(props.percentageFee)
    : props.percentageFee;
  return (val * 100).toFixed(2);
});

const formattedRate = computed(() => {
  const parts: string[] = [];

  const pct = parseFloat(percentageDisplay.value);
  if (pct > 0) {
    parts.push(`${percentageDisplay.value}%`);
  }

  const fixed = typeof props.fixedFee === 'string'
    ? parseFloat(props.fixedFee)
    : props.fixedFee;
  if (fixed > 0) {
    parts.push(`+${fixed}`);
  }

  if (parts.length === 0) {
    return '0';
  }

  const min = typeof props.minimumFee === 'string'
    ? parseFloat(props.minimumFee)
    : props.minimumFee;
  if (min > 0) {
    return `${parts.join(' ')} (最低 ${min})`;
  }

  return parts.join(' ');
});

const chargeModeText = computed(() => {
  return props.chargeMode === 'INTERNAL' ? '内扣' : '外扣';
});
</script>

<style scoped>
.pb-rate-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.rate-text {
  font-family: monospace;
}

.info-icon {
  color: #909399;
  cursor: pointer;
}

.rate-tooltip p {
  margin: 4px 0;
}
</style>
