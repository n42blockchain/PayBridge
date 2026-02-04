<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
    </div>

    <!-- Stats Cards -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>今日充值</template>
          <div class="stat-value">¥ 125,800.00</div>
          <div class="stat-change positive">+12.5%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>今日兑付</template>
          <div class="stat-value">$ 18,500.00</div>
          <div class="stat-change positive">+8.3%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>活跃商户</template>
          <div class="stat-value">156</div>
          <div class="stat-change positive">+3</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>待审核</template>
          <div class="stat-value">8</div>
          <div class="stat-change warning">需处理</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- System Wallets -->
    <el-card class="page-card">
      <template #header>
        <div class="flex items-center justify-between">
          <span>系统钱包</span>
          <el-button type="primary" size="small" @click="handleInitWallets">
            初始化钱包
          </el-button>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="资金池地址">
          <span v-if="walletSummary?.fundPool">
            {{ walletSummary.fundPool.address }}
          </span>
          <el-tag v-else type="warning">未初始化</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="资金池余额">
          <span v-if="walletSummary?.fundPool">
            {{ walletSummary.fundPool.balance }} TOKEN
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="Gas 钱包地址">
          <span v-if="walletSummary?.gas">
            {{ walletSummary.gas.address }}
          </span>
          <el-tag v-else type="warning">未初始化</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Gas 余额">
          <span v-if="walletSummary?.gas">
            {{ walletSummary.gas.nativeBalance }} ETH
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Quick Actions -->
    <el-card class="page-card">
      <template #header>快捷操作</template>
      <el-space wrap>
        <el-button @click="$router.push('/merchant')">
          <el-icon><Shop /></el-icon>
          新建商户
        </el-button>
        <el-button @click="$router.push('/topup-channel')">
          <el-icon><Wallet /></el-icon>
          配置渠道
        </el-button>
        <el-button @click="$router.push('/settlement-order')">
          <el-icon><Files /></el-icon>
          审核兑付
        </el-button>
        <el-button @click="$router.push('/setting')">
          <el-icon><Setting /></el-icon>
          系统设置
        </el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { walletApi } from '@paybridge/shared-api';
import { WalletType, ChainNetwork, type WalletBalanceSummary } from '@paybridge/shared-types';

const walletSummary = ref<WalletBalanceSummary | null>(null);

onMounted(async () => {
  try {
    walletSummary.value = await walletApi.getSystemSummary(ChainNetwork.PAYBRIDGE);
  } catch (error) {
    console.error('Failed to load wallet summary:', error);
  }
});

async function handleInitWallets() {
  try {
    // Create fund pool wallet
    await walletApi.create({
      type: WalletType.FUND_POOL,
      chain: ChainNetwork.PAYBRIDGE,
      label: 'Main Fund Pool',
    });

    // Create gas wallet
    await walletApi.create({
      type: WalletType.GAS,
      chain: ChainNetwork.PAYBRIDGE,
      label: 'Gas Wallet',
    });

    ElMessage.success('系统钱包初始化成功');
    walletSummary.value = await walletApi.getSystemSummary(ChainNetwork.PAYBRIDGE);
  } catch (error: any) {
    ElMessage.error(error.message || '初始化失败');
  }
}
</script>

<style scoped lang="scss">
.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-change {
  margin-top: 8px;
  font-size: 14px;

  &.positive {
    color: #67c23a;
  }

  &.negative {
    color: #f56c6c;
  }

  &.warning {
    color: #e6a23c;
  }
}
</style>
