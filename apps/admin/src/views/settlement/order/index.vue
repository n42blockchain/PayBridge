<template>
  <div class="main-content">
    <el-card shadow="never">
      <template #header>
        <span class="font-bold text-lg">兑付订单</span>
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
            <el-option label="待审核" value="PENDING" />
            <el-option label="审核中" value="REVIEWING" />
            <el-option label="已批准" value="APPROVED" />
            <el-option label="处理中" value="PROCESSING" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="已拒绝" value="REJECTED" />
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
        <template #tokenAmount="{ row }">
          <span class="font-bold text-success">{{ row.tokenAmount }} USDT</span>
        </template>
        <template #fiatAmount="{ row }">
          <span class="font-mono">$ {{ row.fiatAmount }}</span>
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
          <el-button
            v-if="row.status === 'PENDING'"
            link
            type="success"
            size="small"
            @click="handleApprove(row)"
          >
            审核
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
        <el-descriptions-item label="代币金额">
          {{ currentOrder.tokenAmount }} USDT
        </el-descriptions-item>
        <el-descriptions-item label="法币金额">
          $ {{ currentOrder.fiatAmount }}
        </el-descriptions-item>
        <el-descriptions-item label="汇率">
          {{ currentOrder.exchangeRate }}
        </el-descriptions-item>
        <el-descriptions-item label="手续费">
          {{ currentOrder.fee }} USDT
        </el-descriptions-item>
        <el-descriptions-item label="收款账户" :span="2">
          {{ currentOrder.bankAccount || '-' }}
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

    <!-- Approve Dialog -->
    <el-dialog v-model="approveVisible" title="审核订单" width="400px">
      <el-form ref="approveFormRef" :model="approveForm" label-width="80px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="approveForm.approved">
            <el-radio :label="true">批准</el-radio>
            <el-radio :label="false">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!approveForm.approved" label="拒绝原因">
          <el-input
            v-model="approveForm.reason"
            type="textarea"
            placeholder="请输入拒绝原因"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitApprove">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { settlementOrderApi } from "@paybridge/shared-api";
import type { FormInstance } from "element-plus";

defineOptions({
  name: "SettlementOrder"
});

const loading = ref(false);
const submitting = ref(false);
const detailVisible = ref(false);
const approveVisible = ref(false);
const formRef = ref<FormInstance>();
const approveFormRef = ref<FormInstance>();
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

const approveForm = reactive({
  approved: true,
  reason: ""
});

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

type TagType = "primary" | "success" | "warning" | "danger" | "info";
const orderStatusMap: Record<string, { type: TagType; label: string }> = {
  PENDING: { type: "info", label: "待审核" },
  REVIEWING: { type: "warning", label: "审核中" },
  APPROVED: { type: "primary", label: "已批准" },
  PROCESSING: { type: "warning", label: "处理中" },
  SUCCESS: { type: "success", label: "成功" },
  FAILED: { type: "danger", label: "失败" },
  REJECTED: { type: "danger", label: "已拒绝" }
};

const columns: TableColumnList = [
  { label: "订单号", prop: "orderNo", width: 200 },
  { label: "商户", prop: "merchantName", width: 150 },
  { label: "代币金额", prop: "tokenAmount", width: 150, slot: "tokenAmount" },
  { label: "法币金额", prop: "fiatAmount", width: 120, slot: "fiatAmount" },
  { label: "状态", prop: "status", width: 100, slot: "status" },
  { label: "创建时间", prop: "createdAt", width: 180, slot: "createdAt" },
  { label: "操作", width: 150, fixed: "right", slot: "operation" }
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
    const result = await settlementOrderApi.list({
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

function handleApprove(row: any) {
  currentOrder.value = row;
  approveForm.approved = true;
  approveForm.reason = "";
  approveVisible.value = true;
}

async function submitApprove() {
  if (!currentOrder.value) return;
  submitting.value = true;
  try {
    await settlementOrderApi.audit(currentOrder.value.id, {
      status: approveForm.approved ? "APPROVED" : "REJECTED",
      remark: approveForm.reason
    } as any);
    message(approveForm.approved ? "订单已批准" : "订单已拒绝", { type: "success" });
    approveVisible.value = false;
    loadData();
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "操作失败", { type: "error" });
  } finally {
    submitting.value = false;
  }
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

.text-success {
  color: var(--el-color-success);
}
</style>
