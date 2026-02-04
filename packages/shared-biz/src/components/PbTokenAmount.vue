<template>
  <span class="pb-token-amount" :class="{ positive: isPositive, negative: isNegative }">
    {{ formattedAmount }}
    <span v-if="showSymbol" class="token-symbol">{{ symbol }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    amount: string | number;
    decimals?: number;
    symbol?: string;
    showSymbol?: boolean;
    showSign?: boolean;
    highlightSign?: boolean;
  }>(),
  {
    decimals: 8,
    symbol: 'TOKEN',
    showSymbol: false,
    showSign: false,
    highlightSign: false,
  },
);

const numericAmount = computed(() => {
  const val = typeof props.amount === 'string' ? parseFloat(props.amount) : props.amount;
  return isNaN(val) ? 0 : val;
});

const isPositive = computed(() => props.highlightSign && numericAmount.value > 0);
const isNegative = computed(() => props.highlightSign && numericAmount.value < 0);

const formattedAmount = computed(() => {
  const val = numericAmount.value;
  const formatted = val.toFixed(props.decimals).replace(/\.?0+$/, '');

  if (props.showSign && val > 0) {
    return `+${formatted}`;
  }

  return formatted;
});
</script>

<style scoped>
.pb-token-amount {
  font-family: monospace;
  font-variant-numeric: tabular-nums;
}

.pb-token-amount.positive {
  color: #67c23a;
}

.pb-token-amount.negative {
  color: #f56c6c;
}

.token-symbol {
  margin-left: 4px;
  font-size: 0.9em;
  color: #909399;
}
</style>
