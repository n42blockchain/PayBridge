<template>
  <div class="main-content">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold text-lg">商户管理</span>
          <el-button type="primary" @click="openDialog()">
            <IconifyIconOffline icon="ep:plus" class="mr-1" />
            新建商户
          </el-button>
        </div>
      </template>

      <!-- Search Form -->
      <el-form
        ref="formRef"
        :inline="true"
        :model="form"
        class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px] overflow-auto"
      >
        <el-form-item label="商户名称：" prop="search">
          <el-input
            v-model="form.search"
            placeholder="商户名称/编码"
            clearable
            class="!w-[180px]"
          />
        </el-form-item>
        <el-form-item label="状态：" prop="status">
          <el-select
            v-model="form.status"
            placeholder="请选择"
            clearable
            class="!w-[180px]"
          >
            <el-option label="启用" value="ENABLED" />
            <el-option label="禁用" value="DISABLED" />
            <el-option label="冻结" value="FROZEN" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型：" prop="type">
          <el-select
            v-model="form.type"
            placeholder="请选择"
            clearable
            class="!w-[180px]"
          >
            <el-option label="普通商户" value="NORMAL" />
            <el-option label="代理商" value="AGENT" />
          </el-select>
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
        <template #type="{ row }">
          <el-tag :type="row.type === 'AGENT' ? 'warning' : 'info'" size="small">
            {{ row.type === 'AGENT' ? '代理商' : '普通商户' }}
          </el-tag>
        </template>
        <template #status="{ row }">
          <el-tag
            :type="statusMap[row.status]?.type"
            size="small"
          >
            {{ statusMap[row.status]?.label }}
          </el-tag>
        </template>
        <template #createdAt="{ row }">
          {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template #operation="{ row }">
          <el-button
            link
            type="primary"
            size="small"
            @click="router.push(`/merchant/detail/${row.id}`)"
          >
            详情
          </el-button>
          <el-button
            v-if="row.status === 'ENABLED'"
            link
            type="warning"
            size="small"
            @click="handleDisable(row)"
          >
            禁用
          </el-button>
          <el-button
            v-else-if="row.status === 'DISABLED'"
            link
            type="success"
            size="small"
            @click="handleEnable(row)"
          >
            启用
          </el-button>
        </template>
      </pure-table>
    </el-card>

    <!-- Create Dialog -->
    <el-dialog
      v-model="dialogVisible"
      title="新建商户"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="dialogFormRef"
        :model="dialogForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="商户名称" prop="name">
          <el-input v-model="dialogForm.name" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="商户类型" prop="type">
          <el-select v-model="dialogForm.type" class="w-full">
            <el-option label="普通商户" value="NORMAL" />
            <el-option label="代理商" value="AGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="回调地址" prop="callbackUrl">
          <el-input v-model="dialogForm.callbackUrl" placeholder="https://" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { merchantApi } from "@paybridge/shared-api";
import type { FormInstance } from "element-plus";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "MerchantList"
});

const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const dialogFormRef = ref<FormInstance>();
const tableRef = ref();
const dataList = ref<any[]>([]);

const form = reactive({
  search: "",
  status: "",
  type: ""
});

const dialogForm = reactive({
  name: "",
  type: "NORMAL",
  callbackUrl: ""
});

const rules = {
  name: [{ required: true, message: "请输入商户名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择商户类型", trigger: "change" }]
};

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

type TagType = "primary" | "success" | "warning" | "danger" | "info";
const statusMap: Record<string, { type: TagType; label: string }> = {
  ENABLED: { type: "success", label: "启用" },
  DISABLED: { type: "danger", label: "禁用" },
  FROZEN: { type: "warning", label: "冻结" }
};

const columns: TableColumnList = [
  { label: "商户编码", prop: "merchantCode", width: 140 },
  { label: "商户名称", prop: "name", minWidth: 150 },
  { label: "类型", prop: "type", width: 100, slot: "type" },
  { label: "状态", prop: "status", width: 100, slot: "status" },
  { label: "创建时间", prop: "createdAt", width: 180, slot: "createdAt" },
  { label: "操作", width: 180, fixed: "right", slot: "operation" }
];

async function onSearch() {
  pagination.currentPage = 1;
  await loadData();
}

function resetForm(formEl: FormInstance | undefined) {
  if (!formEl) return;
  formEl.resetFields();
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
    const result = await merchantApi.list({
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

function openDialog() {
  dialogForm.name = "";
  dialogForm.type = "NORMAL";
  dialogForm.callbackUrl = "";
  dialogVisible.value = true;
}

async function submitForm() {
  if (!dialogFormRef.value) return;
  await dialogFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        await merchantApi.create(dialogForm as any);
        message("商户创建成功", { type: "success" });
        dialogVisible.value = false;
        loadData();
      } catch (error: unknown) {
        const err = error as { message?: string };
        message(err?.message || "创建失败", { type: "error" });
      } finally {
        submitting.value = false;
      }
    }
  });
}

async function handleEnable(row: any) {
  try {
    await merchantApi.enable(row.id);
    message("已启用", { type: "success" });
    loadData();
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "操作失败", { type: "error" });
  }
}

async function handleDisable(row: any) {
  try {
    await ElMessageBox.confirm("确定要禁用该商户吗？", "提示", {
      type: "warning"
    });
    await merchantApi.disable(row.id);
    message("已禁用", { type: "success" });
    loadData();
  } catch (error: unknown) {
    if (error !== "cancel") {
      const err = error as { message?: string };
      message(err?.message || "操作失败", { type: "error" });
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

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
