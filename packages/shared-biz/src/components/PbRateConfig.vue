<template>
  <div class="pb-rate-config">
    <el-form-item :label="label" :prop="prop">
      <div class="rate-inputs">
        <div class="rate-input-group">
          <span class="rate-label">百分比费率</span>
          <el-input-number
            v-model="percentageValue"
            :min="0"
            :max="100"
            :precision="4"
            :step="0.1"
            :disabled="disabled"
            placeholder="0"
            controls-position="right"
          />
          <span class="rate-suffix">%</span>
        </div>
        <span class="rate-separator">+</span>
        <div class="rate-input-group">
          <span class="rate-label">固定费用</span>
          <el-input-number
            v-model="fixedValue"
            :min="0"
            :precision="8"
            :step="0.01"
            :disabled="disabled"
            placeholder="0"
            controls-position="right"
          />
        </div>
        <span class="rate-separator">=</span>
        <div class="rate-input-group">
          <span class="rate-label">最低费用</span>
          <el-input-number
            v-model="minimumValue"
            :min="0"
            :precision="8"
            :step="0.1"
            :disabled="disabled"
            placeholder="0"
            controls-position="right"
          />
        </div>
      </div>
      <div v-if="showChargeMode" class="charge-mode">
        <span class="charge-mode-label">收费方式：</span>
        <el-radio-group v-model="chargeModeValue" :disabled="disabled">
          <el-radio value="INTERNAL">内扣</el-radio>
          <el-radio value="EXTERNAL">外扣</el-radio>
        </el-radio-group>
      </div>
      <div v-if="description" class="rate-description">
        {{ description }}
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElFormItem, ElInputNumber, ElRadioGroup, ElRadio } from 'element-plus';
import type { FeeChargeMode } from '@paybridge/shared-types';

const props = withDefaults(
  defineProps<{
    label: string;
    prop?: string;
    percentageFee: string | number;
    fixedFee: string | number;
    minimumFee: string | number;
    chargeMode?: FeeChargeMode;
    showChargeMode?: boolean;
    disabled?: boolean;
    description?: string;
  }>(),
  {
    showChargeMode: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:percentageFee', value: string): void;
  (e: 'update:fixedFee', value: string): void;
  (e: 'update:minimumFee', value: string): void;
  (e: 'update:chargeMode', value: FeeChargeMode): void;
}>();

// Convert percentage display value (2.5% -> 0.025)
const percentageValue = computed({
  get: () => {
    const val = typeof props.percentageFee === 'string'
      ? parseFloat(props.percentageFee)
      : props.percentageFee;
    return val * 100;
  },
  set: (value) => {
    emit('update:percentageFee', (value / 100).toFixed(6));
  },
});

const fixedValue = computed({
  get: () => typeof props.fixedFee === 'string' ? parseFloat(props.fixedFee) : props.fixedFee,
  set: (value) => emit('update:fixedFee', value.toString()),
});

const minimumValue = computed({
  get: () => typeof props.minimumFee === 'string' ? parseFloat(props.minimumFee) : props.minimumFee,
  set: (value) => emit('update:minimumFee', value.toString()),
});

const chargeModeValue = computed({
  get: () => props.chargeMode,
  set: (value) => emit('update:chargeMode', value as FeeChargeMode),
});
</script>

<style scoped>
.pb-rate-config {
  width: 100%;
}

.rate-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rate-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rate-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.rate-suffix {
  font-size: 14px;
  color: #606266;
}

.rate-separator {
  color: #909399;
  font-weight: bold;
}

.charge-mode {
  margin-top: 8px;
  display: flex;
  align-items: center;
}

.charge-mode-label {
  font-size: 12px;
  color: #909399;
  margin-right: 8px;
}

.rate-description {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
