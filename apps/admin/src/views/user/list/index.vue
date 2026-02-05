<template>
  <div class="main-content">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold text-lg">用户管理</span>
          <el-button type="primary" @click="openDialog()">
            <IconifyIconOffline icon="ep:plus" class="mr-1" />
            新建用户
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
        <el-form-item label="用户名/邮箱：" prop="search">
          <el-input
            v-model="form.search"
            placeholder="请输入关键词"
            clearable
            class="!w-[180px]"
          />
        </el-form-item>
        <el-form-item label="角色：" prop="role">
          <el-select
            v-model="form.role"
            placeholder="请选择"
            clearable
            class="!w-[140px]"
          >
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="管理员" value="ADMIN" />
            <el-option label="运营" value="OPERATOR" />
            <el-option label="财务" value="FINANCE" />
            <el-option label="客服" value="SUPPORT" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态：" prop="status">
          <el-select
            v-model="form.status"
            placeholder="请选择"
            clearable
            class="!w-[120px]"
          >
            <el-option label="启用" value="ACTIVE" />
            <el-option label="禁用" value="INACTIVE" />
            <el-option label="锁定" value="LOCKED" />
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
        <template #role="{ row }">
          <el-tag :type="roleMap[row.role]?.type" size="small">
            {{ roleMap[row.role]?.label }}
          </el-tag>
        </template>
        <template #status="{ row }">
          <el-tag :type="statusMap[row.status]?.type" size="small">
            {{ statusMap[row.status]?.label }}
          </el-tag>
        </template>
        <template #twoFactorEnabled="{ row }">
          <el-tag :type="row.twoFactorEnabled ? 'success' : 'info'" size="small">
            {{ row.twoFactorEnabled ? '已开启' : '未开启' }}
          </el-tag>
        </template>
        <template #createdAt="{ row }">
          {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template #operation="{ row }">
          <el-button link type="primary" size="small" @click="openDialog(row)">
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            link
            type="warning"
            size="small"
            @click="handleDisable(row)"
          >
            禁用
          </el-button>
          <el-button
            v-else-if="row.status === 'INACTIVE'"
            link
            type="success"
            size="small"
            @click="handleEnable(row)"
          >
            启用
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            @click="handleResetPassword(row)"
          >
            重置密码
          </el-button>
        </template>
      </pure-table>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新建用户'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="dialogFormRef"
        :model="dialogForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="dialogForm.username"
            placeholder="请输入用户名"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="dialogForm.email"
            placeholder="请输入邮箱"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input
            v-model="dialogForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="dialogForm.role" class="w-full">
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="管理员" value="ADMIN" />
            <el-option label="运营" value="OPERATOR" />
            <el-option label="财务" value="FINANCE" />
            <el-option label="客服" value="SUPPORT" />
          </el-select>
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
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { userApi } from "@paybridge/shared-api";
import type { FormInstance } from "element-plus";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "UserList"
});

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const dialogFormRef = ref<FormInstance>();
const tableRef = ref();
const dataList = ref<any[]>([]);
const currentId = ref("");

const form = reactive({
  search: "",
  role: "",
  status: ""
});

const dialogForm = reactive({
  username: "",
  email: "",
  password: "",
  role: "OPERATOR"
});

const rules: any = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email" as const, message: "请输入有效的邮箱地址", trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" }
  ],
  role: [{ required: true, message: "请选择角色", trigger: "change" }]
};

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

type TagType = "primary" | "success" | "warning" | "danger" | "info";
const roleMap: Record<string, { type: TagType; label: string }> = {
  SUPER_ADMIN: { type: "danger", label: "超级管理员" },
  ADMIN: { type: "warning", label: "管理员" },
  OPERATOR: { type: "primary", label: "运营" },
  FINANCE: { type: "success", label: "财务" },
  SUPPORT: { type: "info", label: "客服" }
};

const statusMap: Record<string, { type: TagType; label: string }> = {
  ACTIVE: { type: "success", label: "启用" },
  INACTIVE: { type: "danger", label: "禁用" },
  LOCKED: { type: "warning", label: "锁定" }
};

const columns: TableColumnList = [
  { label: "用户名", prop: "username", width: 120 },
  { label: "邮箱", prop: "email", minWidth: 180 },
  { label: "角色", prop: "role", width: 120, slot: "role" },
  { label: "状态", prop: "status", width: 100, slot: "status" },
  { label: "两步验证", prop: "twoFactorEnabled", width: 100, slot: "twoFactorEnabled" },
  { label: "创建时间", prop: "createdAt", width: 180, slot: "createdAt" },
  { label: "操作", width: 220, fixed: "right", slot: "operation" }
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
    const result = await userApi.list({
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

function openDialog(row?: any) {
  if (row) {
    isEdit.value = true;
    currentId.value = row.id;
    dialogForm.username = row.username;
    dialogForm.email = row.email;
    dialogForm.password = "";
    dialogForm.role = row.role;
  } else {
    isEdit.value = false;
    currentId.value = "";
    dialogForm.username = "";
    dialogForm.email = "";
    dialogForm.password = "";
    dialogForm.role = "OPERATOR";
  }
  dialogVisible.value = true;
}

async function submitForm() {
  if (!dialogFormRef.value) return;
  await dialogFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await userApi.update(currentId.value, { role: dialogForm.role } as any);
          message("用户更新成功", { type: "success" });
        } else {
          await userApi.create({
            ...dialogForm,
            name: dialogForm.username
          } as any);
          message("用户创建成功", { type: "success" });
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

async function handleEnable(row: any) {
  try {
    await userApi.update(row.id, { status: "ACTIVE" } as any);
    message("已启用", { type: "success" });
    loadData();
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "操作失败", { type: "error" });
  }
}

async function handleDisable(row: any) {
  try {
    await ElMessageBox.confirm("确定要禁用该用户吗？", "提示", {
      type: "warning"
    });
    await userApi.update(row.id, { status: "INACTIVE" } as any);
    message("已禁用", { type: "success" });
    loadData();
  } catch (error: unknown) {
    if (error !== "cancel") {
      const err = error as { message?: string };
      message(err?.message || "操作失败", { type: "error" });
    }
  }
}

async function handleResetPassword(row: any) {
  try {
    await ElMessageBox.confirm("确定要重置该用户的密码吗？", "提示", {
      type: "warning"
    });
    const newPassword = Math.random().toString(36).slice(-8);
    await userApi.resetPassword(row.id, newPassword);
    message("密码已重置，新密码已发送到用户邮箱", { type: "success" });
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
