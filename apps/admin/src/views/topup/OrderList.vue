<template>
  <div class="order-list">
    <div class="page-header">
      <h1 class="page-title">充值订单</h1>
    </div>

    <div class="page-card">
      <!-- Filters -->
      <div class="table-toolbar">
        <div class="table-filters">
          <el-input
            v-model="filters.orderNo"
            placeholder="订单号"
            clearable
            style="width: 180px"
            @change="loadData"
          />
          <el-select
            v-model="filters.status"
            placeholder="状态"
            clearable
            style="width: 120px"
            @change="loadData"
          >
            <el-option label="待支付" value="PENDING" />
            <el-option label="支付中" value="PAYING" />
            <el-option label="已支付" value="PAID" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="已关闭" value="CLOSED" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </div>
        <el-button>导出</el-button>
      </div>

      <!-- Table -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="merchantName" label="商户" width="150" />
        <el-table-column prop="fiatAmount" label="法币金额" width="120">
          <template #default="{ row }">
            ¥{{ row.fiatAmount }}
          </template>
        </el-table-column>
        <el-table-column prop="tokenAmount" label="代币金额" width="150">
          <template #default="{ row }">
            <pb-token-amount :amount="row.tokenAmount" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-order-status-tag :status="row.status" order-type="topup" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { topupOrderApi } from '@paybridge/shared-api';
import { PbPagination } from '@paybridge/shared-ui';
import { PbTokenAmount, PbOrderStatusTag } from '@paybridge/shared-biz';

const loading = ref(false);
const list = ref([]);
const dateRange = ref<[string, string] | null>(null);

const filters = reactive({
  orderNo: '',
  status: '',
  startDate: '',
  endDate: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

onMounted(() => loadData());

async function loadData() {
  loading.value = true;
  try {
    const result = await topupOrderApi.list({
      ...filters,
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

function handleDateChange(value: [string, string] | null) {
  if (value) {
    filters.startDate = value[0];
    filters.endDate = value[1];
  } else {
    filters.startDate = '';
    filters.endDate = '';
  }
  loadData();
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>
