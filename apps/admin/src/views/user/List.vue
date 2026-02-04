<template>
  <div class="user-list">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建用户
      </el-button>
    </div>

    <div class="page-card">
      <!-- Filters -->
      <div class="table-toolbar">
        <div class="table-filters">
          <el-input
            v-model="filters.search"
            placeholder="搜索邮箱/姓名"
            clearable
            style="width: 200px"
            @change="loadData"
          />
          <el-select
            v-model="filters.role"
            placeholder="角色"
            clearable
            style="width: 140px"
            @change="loadData"
          >
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="管理员" value="ADMIN" />
            <el-option label="运营" value="OPERATOR" />
            <el-option label="财务" value="FINANCE" />
            <el-option label="一级审核" value="AUDITOR_L1" />
            <el-option label="二级审核" value="AUDITOR_L2" />
            <el-option label="三级审核" value="AUDITOR_L3" />
          </el-select>
          <el-select
            v-model="filters.status"
            placeholder="状态"
            clearable
            style="width: 100px"
            @change="loadData"
          >
            <el-option label="活跃" value="ACTIVE" />
            <el-option label="锁定" value="LOCKED" />
          </el-select>
        </div>
      </div>

      <!-- Table -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getRoleName(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-status-tag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="twoFactorEnabled" label="2FA" width="80">
          <template #default="{ row }">
            <el-tag :type="row.twoFactorEnabled ? 'success' : 'info'" size="small">
              {{ row.twoFactorEnabled ? '已启用' : '未启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="180">
          <template #default="{ row }">
            {{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary">编辑</el-button>
            <el-button link type="warning">重置密码</el-button>
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

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建用户" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="user@example.com" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少8位" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="运营" value="OPERATOR" />
            <el-option label="财务" value="FINANCE" />
            <el-option label="一级审核" value="AUDITOR_L1" />
            <el-option label="二级审核" value="AUDITOR_L2" />
            <el-option label="三级审核" value="AUDITOR_L3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { userApi } from '@paybridge/shared-api';
import { PbStatusTag, PbPagination } from '@paybridge/shared-ui';

const loading = ref(false);
const creating = ref(false);
const showCreateDialog = ref(false);
const list = ref([]);
const formRef = ref();

const filters = reactive({
  search: '',
  role: '',
  status: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const form = reactive({
  email: '',
  name: '',
  password: '',
  role: 'OPERATOR',
});

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少8位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

const roleNames: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  OPERATOR: '运营',
  FINANCE: '财务',
  AUDITOR_L1: '一级审核',
  AUDITOR_L2: '二级审核',
  AUDITOR_L3: '三级审核',
};

onMounted(() => loadData());

async function loadData() {
  loading.value = true;
  try {
    const result = await userApi.list({
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

async function handleCreate() {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  creating.value = true;
  try {
    await userApi.create(form as any);
    ElMessage.success('用户创建成功');
    showCreateDialog.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败');
  } finally {
    creating.value = false;
  }
}

function getRoleName(role: string) {
  return roleNames[role] || role;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>
