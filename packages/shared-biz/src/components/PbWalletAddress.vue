<template>
  <div class="pb-wallet-address">
    <span class="address-text" :title="address">
      {{ displayAddress }}
    </span>
    <el-button
      type="primary"
      :icon="CopyDocument"
      circle
      size="small"
      @click="handleCopy"
    />
    <el-button
      v-if="explorerUrl"
      type="info"
      :icon="Link"
      circle
      size="small"
      @click="openExplorer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import { CopyDocument, Link } from '@element-plus/icons-vue';
import type { ChainNetwork } from '@paybridge/shared-types';

const props = withDefaults(
  defineProps<{
    address: string;
    chain?: ChainNetwork;
    truncate?: boolean;
    prefixLength?: number;
    suffixLength?: number;
  }>(),
  {
    truncate: true,
    prefixLength: 6,
    suffixLength: 4,
  },
);

const displayAddress = computed(() => {
  if (!props.truncate || props.address.length < props.prefixLength + props.suffixLength + 6) {
    return props.address;
  }
  const prefix = props.address.slice(0, 2 + props.prefixLength);
  const suffix = props.address.slice(-props.suffixLength);
  return `${prefix}...${suffix}`;
});

const explorerUrls: Record<string, string> = {
  ETHEREUM: 'https://etherscan.io',
  BSC: 'https://bscscan.com',
  POLYGON: 'https://polygonscan.com',
  ARBITRUM: 'https://arbiscan.io',
};

const explorerUrl = computed(() => {
  if (!props.chain) return null;
  const baseUrl = explorerUrls[props.chain];
  if (!baseUrl) return null;
  return `${baseUrl}/address/${props.address}`;
});

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.address);
    ElMessage.success('地址已复制');
  } catch {
    ElMessage.error('复制失败');
  }
}

function openExplorer() {
  if (explorerUrl.value) {
    window.open(explorerUrl.value, '_blank');
  }
}
</script>

<style scoped>
.pb-wallet-address {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.address-text {
  font-family: monospace;
  font-size: 13px;
}
</style>
