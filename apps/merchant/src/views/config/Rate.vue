<template>
  <div class="rate-page">
    <div class="page-header">
      <h1 class="page-title">费率查看</h1>
    </div>

    <el-card v-loading="loading" class="page-card">
      <el-descriptions :column="1" border title="充值费率">
        <el-descriptions-item label="费率">
          <pb-rate-display
            :percentage-fee="config?.topupPercentageFee || '0'"
            :fixed-fee="config?.topupFixedFee || '0'"
            :minimum-fee="config?.topupMinimumFee || '0'"
          />
        </el-descriptions-item>
        <el-descriptions-item label="收费方式">
          {{ config?.topupFeeChargeMode === 'INTERNAL' ? '内扣（从到账金额扣除）' : '外扣（用户额外支付）' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-loading="loading" class="page-card">
      <el-descriptions :column="1" border title="兑付费率">
        <el-descriptions-item label="费率">
          <pb-rate-display
            :percentage-fee="config?.settlementPercentageFee || '0'"
            :fixed-fee="config?.settlementFixedFee || '0'"
            :minimum-fee="config?.settlementMinimumFee || '0'"
          />
        </el-descriptions-item>
        <el-descriptions-item label="收费方式">
          {{ config?.settlementFeeChargeMode === 'INTERNAL' ? '内扣' : '外扣' }}
        </el-descriptions-item>
        <el-descriptions-item label="最低起兑金额">
          {{ config?.settlementMinAmount || '0' }} TOKEN
        </el-descriptions-item>
        <el-descriptions-item label="单笔最高金额">
          {{ config?.settlementMaxAmount || '0' }} TOKEN
        </el-descriptions-item>
        <el-descriptions-item label="兑付周期">
          D+{{ config?.settlementCycleDays || 0 }}（提交申请后 {{ config?.settlementCycleDays || 0 }} 天处理）
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-loading="loading" class="page-card">
      <el-descriptions :column="1" border title="退款费率">
        <el-descriptions-item label="费率">
          <pb-rate-display
            :percentage-fee="config?.refundPercentageFee || '0'"
            :fixed-fee="config?.refundFixedFee || '0'"
            :minimum-fee="config?.refundMinimumFee || '0'"
          />
        </el-descriptions-item>
        <el-descriptions-item label="保证金要求">
          最低保证金余额 {{ config?.depositMinBalance || '0' }} TOKEN
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { merchantApi } from '@paybridge/shared-api';
import { PbRateDisplay } from '@paybridge/shared-biz';
import type { MerchantConfigDto } from '@paybridge/shared-types';

const loading = ref(true);
const config = ref<MerchantConfigDto | null>(null);

onMounted(async () => {
  try {
    const merchant = await merchantApi.getMe();
    config.value = merchant.config || null;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
});
</script>
