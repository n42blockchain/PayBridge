<template>
  <div class="merchant-detail" v-loading="loading">
    <div class="page-header">
      <div class="flex items-center gap-4">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="page-title">商户详情</h1>
      </div>
    </div>

    <template v-if="merchant">
      <!-- Basic Info -->
      <el-card class="page-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span>基本信息</span>
            <pb-status-tag :status="merchant.status" />
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="商户编码">{{ merchant.merchantCode }}</el-descriptions-item>
          <el-descriptions-item label="商户名称">{{ merchant.name }}</el-descriptions-item>
          <el-descriptions-item label="商户类型">
            {{ merchant.type === 'AGENT' ? '代理商' : '普通商户' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(merchant.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="回调地址" :span="2">
            {{ merchant.callbackUrl || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Fee Config -->
      <el-card v-if="merchant.config" class="page-card">
        <template #header>费率配置</template>
        <el-form label-width="120px">
          <div class="form-section">
            <div class="section-title">充值费率</div>
            <pb-rate-display
              :percentage-fee="merchant.config.topupPercentageFee"
              :fixed-fee="merchant.config.topupFixedFee"
              :minimum-fee="merchant.config.topupMinimumFee"
              :charge-mode="merchant.config.topupFeeChargeMode"
            />
          </div>
          <div class="form-section">
            <div class="section-title">兑付费率</div>
            <pb-rate-display
              :percentage-fee="merchant.config.settlementPercentageFee"
              :fixed-fee="merchant.config.settlementFixedFee"
              :minimum-fee="merchant.config.settlementMinimumFee"
              :charge-mode="merchant.config.settlementFeeChargeMode"
            />
          </div>
          <div class="form-section">
            <div class="section-title">退款费率</div>
            <pb-rate-display
              :percentage-fee="merchant.config.refundPercentageFee"
              :fixed-fee="merchant.config.refundFixedFee"
              :minimum-fee="merchant.config.refundMinimumFee"
            />
          </div>
        </el-form>
      </el-card>

      <!-- Gateway Config -->
      <el-card v-if="merchant.config" class="page-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span>网关配置</span>
            <el-button type="warning" size="small" @click="handleResetApiSecret">
              重置密钥
            </el-button>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="API Key">
            <code>{{ merchant.config.apiKey }}</code>
            <el-button type="primary" size="small" link @click="copyToClipboard(merchant.config.apiKey)">
              复制
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="签名算法">
            {{ merchant.config.encryptionAlgorithm }}
          </el-descriptions-item>
          <el-descriptions-item label="IP 白名单">
            <template v-if="merchant.config.ipWhitelist?.length">
              <el-tag v-for="ip in merchant.config.ipWhitelist" :key="ip" class="mr-2">
                {{ ip }}
              </el-tag>
            </template>
            <span v-else class="text-gray-400">未配置</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Wallet Balances -->
      <el-card class="page-card">
        <template #header>钱包余额</template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="托管钱包">
            <pb-token-amount :amount="merchant.walletBalances?.custody || '0'" symbol="TOKEN" show-symbol />
          </el-descriptions-item>
          <el-descriptions-item label="保证金">
            <pb-token-amount :amount="merchant.walletBalances?.deposit || '0'" symbol="TOKEN" show-symbol />
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { merchantApi } from '@paybridge/shared-api';
import { PbStatusTag } from '@paybridge/shared-ui';
import { PbRateDisplay, PbTokenAmount } from '@paybridge/shared-biz';
import type { MerchantDetailDto } from '@paybridge/shared-types';

const route = useRoute();
const loading = ref(true);
const merchant = ref<MerchantDetailDto | null>(null);

onMounted(async () => {
  const id = route.params.id as string;
  try {
    merchant.value = await merchantApi.getById(id);
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
});

async function handleResetApiSecret() {
  if (!merchant.value) return;

  try {
    await ElMessageBox.confirm(
      '重置后原有密钥将失效，确定要重置吗？',
      '警告',
      { type: 'warning' },
    );

    const result = await merchantApi.resetApiSecret(merchant.value.id);

    await ElMessageBox.alert(
      `新的 API Key: ${result.apiKey}\n新的 API Secret: ${result.apiSecret}\n\n请妥善保存，Secret 仅显示一次！`,
      '密钥已重置',
      { type: 'success' },
    );

    // Reload to get new API Key
    merchant.value = await merchantApi.getById(merchant.value.id);
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制');
  } catch {
    ElMessage.error('复制失败');
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>
