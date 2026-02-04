<template>
  <div class="wallet-page">
    <div class="page-header">
      <h1 class="page-title">钱包总览</h1>
    </div>

    <!-- Wallet Cards -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">托管钱包余额</div>
          <div class="stat-value">
            <pb-token-amount :amount="merchant?.walletBalances?.custody || '0'" :decimals="4" />
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card green">
          <div class="stat-label">保证金余额</div>
          <div class="stat-value">
            <pb-token-amount :amount="merchant?.walletBalances?.deposit || '0'" :decimals="4" />
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card orange">
          <div class="stat-label">可兑付金额</div>
          <div class="stat-value">
            <pb-token-amount :amount="availableAmount" :decimals="4" />
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Wallet Details -->
    <el-card class="page-card">
      <template #header>钱包信息</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="托管钱包地址">
          <pb-wallet-address
            v-if="custodyAddress"
            :address="custodyAddress"
            :chain="merchant?.settlementChain"
          />
          <el-tag v-else type="warning">未分配</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="保证金钱包地址">
          <pb-wallet-address
            v-if="depositAddress"
            :address="depositAddress"
            :chain="merchant?.settlementChain"
          />
          <el-tag v-else type="warning">未分配</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="兑付接收地址">
          <pb-wallet-address
            v-if="merchant?.settlementAddress"
            :address="merchant.settlementAddress"
            :chain="merchant?.settlementChain"
          />
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Quick Actions -->
    <el-card class="page-card">
      <template #header>快捷操作</template>
      <el-space>
        <el-button type="primary" @click="$router.push('/settlement')">
          <el-icon><Money /></el-icon>
          申请兑付
        </el-button>
        <el-button @click="$router.push('/topup-order')">
          <el-icon><Document /></el-icon>
          查看订单
        </el-button>
        <el-button @click="$router.push('/config')">
          <el-icon><Setting /></el-icon>
          网关配置
        </el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { merchantApi } from '@paybridge/shared-api';
import { PbTokenAmount, PbWalletAddress } from '@paybridge/shared-biz';
import type { MerchantDetailDto } from '@paybridge/shared-types';

const merchant = ref<MerchantDetailDto | null>(null);

const custodyAddress = computed(() => {
  // In a real app, this would come from merchant wallet data
  return merchant.value?.selfCustodyAddress;
});

const depositAddress = computed(() => {
  // In a real app, this would come from merchant wallet data
  return null;
});

const availableAmount = computed(() => {
  const custody = parseFloat(merchant.value?.walletBalances?.custody || '0');
  const minDeposit = parseFloat(merchant.value?.config?.depositMinBalance || '0');
  const deposit = parseFloat(merchant.value?.walletBalances?.deposit || '0');

  // Available = custody balance, but deposit must meet minimum
  if (deposit < minDeposit) {
    return '0';
  }
  return custody.toString();
});

onMounted(async () => {
  try {
    merchant.value = await merchantApi.getMe();
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  }
});
</script>
