<template>
  <div class="order-list">
    <div class="page-header">
      <h1 class="page-title">兑付订单</h1>
    </div>

    <div class="page-card">
      <!-- Quick Views -->
      <el-radio-group v-model="quickView" class="mb-4" @change="loadData">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="pendingAudit">待审核</el-radio-button>
        <el-radio-button value="settling">兑付中</el-radio-button>
        <el-radio-button value="success">已完成</el-radio-button>
      </el-radio-group>

      <!-- Table -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="settlementNo" label="兑付单号" width="200" />
        <el-table-column prop="merchantName" label="商户" width="150" />
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
        <el-table-column prop="currentAuditLevel" label="审核进度" width="100">
          <template #default="{ row }">
            L{{ row.currentAuditLevel }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary">详情</el-button>
            <el-button
              v-if="canAudit(row)"
              link
              type="success"
            >
              审核
            </el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { settlementOrderApi } from '@paybridge/shared-api';
import { PbPagination } from '@paybridge/shared-ui';
import { PbTokenAmount, PbOrderStatusTag } from '@paybridge/shared-biz';

const loading = ref(false);
const list = ref([]);
const quickView = ref('');

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

onMounted(() => loadData());

async function loadData() {
  loading.value = true;
  try {
    const query: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };

    if (quickView.value === 'pendingAudit') {
      query.status = 'PENDING_AUDIT';
    } else if (quickView.value === 'settling') {
      query.status = 'SETTLING';
    } else if (quickView.value === 'success') {
      query.status = 'SUCCESS';
    }

    const result = await settlementOrderApi.list(query);
    list.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function canAudit(row: any) {
  return ['PENDING_AUDIT', 'AUDITING'].includes(row.status);
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>
