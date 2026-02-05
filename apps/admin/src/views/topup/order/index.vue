<template>
  <div class="main-content">
    <el-card shadow="never">
      <template #header>
        <span class="font-bold text-lg">充值订单</span>
      </template>

      <!-- Search Form -->
      <el-form
        ref="formRef"
        :inline="true"
        :model="form"
        class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px] overflow-auto"
      >
        <el-form-item label="订单号：" prop="orderNo">
          <el-input
            v-model="form.orderNo"
            placeholder="请输入订单号"
            clearable
            class="!w-[180px]"
          />
        </el-form-item>
        <el-form-item label="状态：" prop="status">
          <el-select
            v-model="form.status"
            placeholder="请选择"
            clearable
            class="!w-[140px]"
          >
            <el-option label="待支付" value="PENDING" />
            <el-option label="支付中" value="PAYING" />
            <el-option label="已支付" value="PAID" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="已关闭" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期：">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="!w-[240px]"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="useRenderIcon('ep:search')" @click="onSearch">
            搜索
          </el-button>
          <el-button :icon="useRenderIcon('ep:refresh')" @click="resetForm(formRef)">
            重置
          </el-button>
          <el-button type="success" :icon="useRenderIcon('ep:download')">
            导出
          </el-button>
        </el-form-item>
      </el-form>

      <!-- Table -->
      <pure-table
        ref="tableRef"
        adaptive
        align-whole="center"
        row-key="id"
        showOverflowTooltip
        :loading="loading"
        :data="dataList"
        :columns="columns"
        :pagination="pagination"
        @page-size-change="handleSizeChange"
        @page-current-change="handleCurrentChange"
      >
        <template #fiatAmount="{ row }">
          <span class="font-bold text-primary">¥{{ row.fiatAmount }}</span>
        </template>
        <template #tokenAmount="{ row }">
          <span class="font-mono">{{ row.tokenAmount }} USDT</span>
        </template>
        <template #status="{ row }">
          <el-tag :type="orderStatusMap[row.status]?.type" size="small">
            {{ orderStatusMap[row.status]?.label }}
          </el-tag>
        </template>
        <template #createdAt="{ row }">
          {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template #operation="{ row }">
          <el-button link type="primary" size="small" @click="showDetail(row)">
            详情
          </el-button>
        </template>
      </pure-table>
    </el-card>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <el-descriptions v-if="currentOrder" :column="2" border>
        <el-descriptions-item label="订单号" :span="2">
          {{ currentOrder.orderNo }}
        </el-descriptions-item>
        <el-descriptions-item label="商户">
          {{ currentOrder.merchantName }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="orderStatusMap[currentOrder.status]?.type" size="small">
            {{ orderStatusMap[currentOrder.status]?.label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="法币金额">
          ¥{{ currentOrder.fiatAmount }}
        </el-descriptions-item>
        <el-descriptions-item label="代币金额">
          {{ currentOrder.tokenAmount }} USDT
        </el-descriptions-item>
        <el-descriptions-item label="汇率">
          {{ currentOrder.exchangeRate }}
        </el-descriptions-item>
        <el-descriptions-item label="手续费">
          {{ currentOrder.fee }} USDT
        </el-descriptions-item>
        <el-descriptions-item label="交易哈希" :span="2">
          <span class="font-mono text-xs break-all">
            {{ currentOrder.txHash || '-' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ dayjs(currentOrder.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ dayjs(currentOrder.updatedAt).format('YYYY-MM-DD HH:mm:ss') }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { topupOrderApi } from "@paybridge/shared-api";
import type { FormInstance } from "element-plus";

defineOptions({
  name: "TopupOrder"
});

const loading = ref(false);
const detailVisible = ref(false);
const formRef = ref<FormInstance>();
const tableRef = ref();
const dataList = ref<any[]>([]);
const currentOrder = ref<any>(null);
const dateRange = ref<[string, string] | null>(null);

const form = reactive({
  orderNo: "",
  status: "",
  startDate: "",
  endDate: ""
});

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

type TagType = "primary" | "success" | "warning" | "danger" | "info";
const orderStatusMap: Record<string, { type: TagType; label: string }> = {
  PENDING: { type: "info", label: "待支付" },
  PAYING: { type: "warning", label: "支付中" },
  PAID: { type: "primary", label: "已支付" },
  SUCCESS: { type: "success", label: "成功" },
  FAILED: { type: "danger", label: "失败" },
  CLOSED: { type: "info", label: "已关闭" }
};

const columns: TableColumnList = [
  { label: "订单号", prop: "orderNo", width: 200 },
  { label: "商户", prop: "merchantName", width: 150 },
  { label: "法币金额", prop: "fiatAmount", width: 120, slot: "fiatAmount" },
  { label: "代币金额", prop: "tokenAmount", width: 150, slot: "tokenAmount" },
  { label: "状态", prop: "status", width: 100, slot: "status" },
  { label: "创建时间", prop: "createdAt", width: 180, slot: "createdAt" },
  { label: "操作", width: 100, fixed: "right", slot: "operation" }
];

watch(dateRange, val => {
  if (val) {
    form.startDate = val[0];
    form.endDate = val[1];
  } else {
    form.startDate = "";
    form.endDate = "";
  }
});

async function onSearch() {
  pagination.currentPage = 1;
  await loadData();
}

function resetForm(formEl: FormInstance | undefined) {
  if (!formEl) return;
  formEl.resetFields();
  dateRange.value = null;
  onSearch();
}

function handleSizeChange(val: number) {
  pagination.pageSize = val;
  loadData();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  loadData();
}

async function loadData() {
  loading.value = true;
  try {
    const result = await topupOrderApi.list({
      ...form,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    } as any);
    dataList.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "加载失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function showDetail(row: any) {
  currentOrder.value = row;
  detailVisible.value = true;
}

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.main-content {
  margin: 20px;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
