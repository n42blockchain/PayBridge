<template>
  <div class="merchant-list">
    <div class="page-header">
      <h1 class="page-title">商户管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建商户
      </el-button>
    </div>

    <div class="page-card">
      <!-- Filters -->
      <div class="table-toolbar">
        <div class="table-filters">
          <el-input
            v-model="filters.search"
            placeholder="搜索商户名称/编码"
            clearable
            style="width: 200px"
            @change="loadData"
          />
          <el-select
            v-model="filters.status"
            placeholder="状态"
            clearable
            style="width: 120px"
            @change="loadData"
          >
            <el-option label="启用" value="ENABLED" />
            <el-option label="禁用" value="DISABLED" />
            <el-option label="冻结" value="FROZEN" />
          </el-select>
          <el-select
            v-model="filters.type"
            placeholder="类型"
            clearable
            style="width: 120px"
            @change="loadData"
          >
            <el-option label="普通商户" value="NORMAL" />
            <el-option label="代理商" value="AGENT" />
          </el-select>
        </div>
      </div>

      <!-- Table -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="merchantCode" label="商户编码" width="140" />
        <el-table-column prop="name" label="商户名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'AGENT' ? 'warning' : 'info'" size="small">
              {{ row.type === 'AGENT' ? '代理商' : '普通商户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-status-tag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/merchant/${row.id}`)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'ENABLED'"
              link
              type="warning"
              @click="handleDisable(row.id)"
            >
              禁用
            </el-button>
            <el-button
              v-else-if="row.status === 'DISABLED'"
              link
              type="success"
              @click="handleEnable(row.id)"
            >
              启用
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <pb-pagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        @change="loadData"
      />
    </div>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建商户" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="商户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="商户类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="普通商户" value="NORMAL" />
            <el-option label="代理商" value="AGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="回调地址" prop="callbackUrl">
          <el-input v-model="form.callbackUrl" placeholder="https://" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { merchantApi } from '@paybridge/shared-api';
import { PbStatusTag, PbPagination } from '@paybridge/shared-ui';
import type { MerchantDto } from '@paybridge/shared-types';

const loading = ref(false);
const creating = ref(false);
const showCreateDialog = ref(false);
const list = ref<MerchantDto[]>([]);
const formRef = ref();

const filters = reactive({
  search: '',
  status: '',
  type: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const form = reactive({
  name: '',
  type: 'NORMAL' as const,
  callbackUrl: '',
});

const rules = {
  name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择商户类型', trigger: 'change' }],
};

onMounted(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const result = await merchantApi.list({
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
    await merchantApi.create(form);
    ElMessage.success('商户创建成功');
    showCreateDialog.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败');
  } finally {
    creating.value = false;
  }
}

async function handleEnable(id: string) {
  try {
    await merchantApi.enable(id);
    ElMessage.success('已启用');
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  }
}

async function handleDisable(id: string) {
  try {
    await ElMessageBox.confirm('确定要禁用该商户吗？', '提示', {
      type: 'warning',
    });
    await merchantApi.disable(id);
    ElMessage.success('已禁用');
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>
