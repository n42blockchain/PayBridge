<template>
  <div class="settlement-page">
    <div class="page-header">
      <h1 class="page-title">兑付管理</h1>
      <el-button type="primary" @click="showApplyDialog = true">
        <el-icon><Plus /></el-icon>
        申请兑付
      </el-button>
    </div>

    <!-- Summary -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="8">
        <el-card>
          <el-statistic title="可兑付金额" :value="availableAmount" suffix="TOKEN" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="处理中" :value="processingCount" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="本月已兑付" :value="monthlyTotal" suffix="USDT" />
        </el-card>
      </el-col>
    </el-row>

    <!-- List -->
    <div class="page-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="settlementNo" label="兑付单号" width="200" />
        <el-table-column prop="tokenAmount" label="代币金额" width="150">
          <template #default="{ row }">
            <pb-token-amount :amount="row.tokenAmount" />
          </template>
        </el-table-column>
        <el-table-column prop="usdtAmount" label="USDT金额" width="150">
          <template #default="{ row }">
            <pb-token-amount :amount="row.usdtAmount" symbol="USDT" show-symbol />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-order-status-tag :status="row.status" order-type="settlement" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default>
            <el-button link type="primary">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pb-pagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        @change="loadData"
      />
    </div>

    <!-- Apply Dialog -->
    <el-dialog v-model="showApplyDialog" title="申请兑付" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="兑付金额" prop="tokenAmount">
          <el-input-number
            v-model="form.tokenAmount"
            :min="0"
            :precision="8"
            style="width: 100%"
            placeholder="请输入兑付金额"
          />
        </el-form-item>
        <el-form-item label="预计到账">
          <span class="preview-amount">≈ {{ previewUsdtAmount }} USDT</span>
          <span class="preview-tip">（含手续费）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleApply">
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { settlementOrderApi, merchantApi } from '@paybridge/shared-api';
import { PbPagination } from '@paybridge/shared-ui';
import { PbTokenAmount, PbOrderStatusTag } from '@paybridge/shared-biz';

const loading = ref(false);
const submitting = ref(false);
const showApplyDialog = ref(false);
const list = ref([]);
const formRef = ref();

const availableAmount = ref(0);
const processingCount = ref(0);
const monthlyTotal = ref(0);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const form = reactive({
  tokenAmount: 0,
});

const rules = {
  tokenAmount: [
    { required: true, message: '请输入兑付金额', trigger: 'blur' },
    { type: 'number', min: 100, message: '最低兑付金额为 100', trigger: 'blur' },
  ],
};

const previewUsdtAmount = computed(() => {
  // Simple calculation, actual would use merchant config
  const rate = 1; // Exchange rate
  const fee = form.tokenAmount * 0.01; // 1% fee
  return ((form.tokenAmount - fee) * rate).toFixed(2);
});

onMounted(async () => {
  loadData();
  loadSummary();
});

async function loadData() {
  loading.value = true;
  try {
    const result = await settlementOrderApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    list.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadSummary() {
  try {
    const merchant = await merchantApi.getMe();
    availableAmount.value = parseFloat(merchant.walletBalances?.custody || '0');
  } catch {
    // Ignore
  }
}

async function handleApply() {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await settlementOrderApi.create({
      tokenAmount: form.tokenAmount.toString(),
    });
    ElMessage.success('兑付申请已提交');
    showApplyDialog.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '申请失败');
  } finally {
    submitting.value = false;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>

<style scoped>
.preview-amount {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
}

.preview-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
