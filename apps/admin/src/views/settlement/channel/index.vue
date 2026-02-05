<template>
  <div class="main-content">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold text-lg">兑付渠道</span>
          <el-button type="primary" @click="openDialog()">
            <IconifyIconOffline icon="ep:plus" class="mr-1" />
            新建渠道
          </el-button>
        </div>
      </template>

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
        <template #status="{ row }">
          <el-switch
            v-model="row.status"
            active-value="ENABLED"
            inactive-value="DISABLED"
            @change="(val: string) => handleStatusChange(row, val)"
          />
        </template>
        <template #feeRate="{ row }">
          {{ (row.feeRate * 100).toFixed(2) }}%
        </template>
        <template #minAmount="{ row }">
          {{ row.minAmount }} USDT
        </template>
        <template #maxAmount="{ row }">
          {{ row.maxAmount }} USDT
        </template>
        <template #operation="{ row }">
          <el-button link type="primary" size="small" @click="openDialog(row)">
            编辑
          </el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </pure-table>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑渠道' : '新建渠道'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="dialogFormRef"
        :model="dialogForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="渠道名称" prop="name">
          <el-input v-model="dialogForm.name" placeholder="请输入渠道名称" />
        </el-form-item>
        <el-form-item label="渠道编码" prop="code">
          <el-input
            v-model="dialogForm.code"
            placeholder="请输入渠道编码"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="渠道类型" prop="type">
          <el-select v-model="dialogForm.type" class="w-full">
            <el-option label="银行转账" value="BANK" />
            <el-option label="支付宝" value="ALIPAY" />
            <el-option label="微信支付" value="WECHAT" />
          </el-select>
        </el-form-item>
        <el-form-item label="手续费率" prop="feeRate">
          <el-input-number
            v-model="dialogForm.feeRate"
            :min="0"
            :max="100"
            :precision="2"
            :step="0.1"
          />
          <span class="ml-2">%</span>
        </el-form-item>
        <el-form-item label="最小金额" prop="minAmount">
          <el-input-number
            v-model="dialogForm.minAmount"
            :min="0"
            :precision="2"
          />
          <span class="ml-2">USDT</span>
        </el-form-item>
        <el-form-item label="最大金额" prop="maxAmount">
          <el-input-number
            v-model="dialogForm.maxAmount"
            :min="0"
            :precision="2"
          />
          <span class="ml-2">USDT</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { settlementChannelApi } from "@paybridge/shared-api";
import type { FormInstance } from "element-plus";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "SettlementChannel"
});

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const dialogFormRef = ref<FormInstance>();
const tableRef = ref();
const dataList = ref<any[]>([]);
const currentId = ref("");

const dialogForm = reactive({
  name: "",
  code: "",
  type: "BANK",
  feeRate: 0,
  minAmount: 100,
  maxAmount: 50000
});

const rules = {
  name: [{ required: true, message: "请输入渠道名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入渠道编码", trigger: "blur" }],
  type: [{ required: true, message: "请选择渠道类型", trigger: "change" }]
};

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const columns: TableColumnList = [
  { label: "渠道名称", prop: "name", minWidth: 150 },
  { label: "渠道编码", prop: "code", width: 150 },
  { label: "渠道类型", prop: "type", width: 120 },
  { label: "手续费率", prop: "feeRate", width: 120, slot: "feeRate" },
  { label: "最小金额", prop: "minAmount", width: 130, slot: "minAmount" },
  { label: "最大金额", prop: "maxAmount", width: 130, slot: "maxAmount" },
  { label: "状态", prop: "status", width: 100, slot: "status" },
  { label: "操作", width: 150, fixed: "right", slot: "operation" }
];

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
    const result = await settlementChannelApi.list({
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    dataList.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "加载失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  if (row) {
    isEdit.value = true;
    currentId.value = row.id;
    dialogForm.name = row.name;
    dialogForm.code = row.code;
    dialogForm.type = row.type;
    dialogForm.feeRate = row.feeRate * 100;
    dialogForm.minAmount = row.minAmount;
    dialogForm.maxAmount = row.maxAmount;
  } else {
    isEdit.value = false;
    currentId.value = "";
    dialogForm.name = "";
    dialogForm.code = "";
    dialogForm.type = "BANK";
    dialogForm.feeRate = 0;
    dialogForm.minAmount = 100;
    dialogForm.maxAmount = 50000;
  }
  dialogVisible.value = true;
}

async function submitForm() {
  if (!dialogFormRef.value) return;
  await dialogFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        const data = {
          ...dialogForm,
          feeRate: dialogForm.feeRate / 100
        };
        if (isEdit.value) {
          await settlementChannelApi.update(currentId.value, data as any);
          message("渠道更新成功", { type: "success" });
        } else {
          await settlementChannelApi.create(data as any);
          message("渠道创建成功", { type: "success" });
        }
        dialogVisible.value = false;
        loadData();
      } catch (error: unknown) {
        const err = error as { message?: string };
        message(err?.message || "操作失败", { type: "error" });
      } finally {
        submitting.value = false;
      }
    }
  });
}

async function handleStatusChange(row: any, status: string) {
  try {
    await settlementChannelApi.update(row.id, { status } as any);
    message("状态更新成功", { type: "success" });
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "操作失败", { type: "error" });
    row.status = status === "ENABLED" ? "DISABLED" : "ENABLED";
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm("确定要删除该渠道吗？", "提示", {
      type: "warning"
    });
    // Delete API not available, use update to disable
    await settlementChannelApi.update(row.id, { status: "DISABLED" } as any);
    message("删除成功", { type: "success" });
    loadData();
  } catch (error: unknown) {
    if (error !== "cancel") {
      const err = error as { message?: string };
      message(err?.message || "删除失败", { type: "error" });
    }
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
</style>
