<template>
  <div class="refund-list">
    <div class="page-header">
      <h1 class="page-title">退款订单</h1>
    </div>

    <div class="page-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="refundNo" label="退款单号" width="200" />
        <el-table-column prop="orderNo" label="原订单号" width="200" />
        <el-table-column prop="refundFiatAmount" label="退款金额" width="120">
          <template #default="{ row }">
            ¥{{ row.refundFiatAmount }}
          </template>
        </el-table-column>
        <el-table-column prop="depositDeduction" label="保证金扣除" width="150">
          <template #default="{ row }">
            <pb-token-amount :amount="row.depositDeduction" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-order-status-tag :status="row.status" order-type="refund" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
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
import { refundOrderApi } from '@paybridge/shared-api';
import { PbPagination } from '@paybridge/shared-ui';
import { PbTokenAmount, PbOrderStatusTag } from '@paybridge/shared-biz';

const loading = ref(false);
const list = ref([]);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

onMounted(() => loadData());

async function loadData() {
  loading.value = true;
  try {
    const result = await refundOrderApi.list({
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

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>
