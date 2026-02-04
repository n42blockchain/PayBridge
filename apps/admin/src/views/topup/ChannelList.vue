<template>
  <div class="channel-list">
    <div class="page-header">
      <h1 class="page-title">充值渠道</h1>
      <el-button type="primary">
        <el-icon><Plus /></el-icon>
        新建渠道
      </el-button>
    </div>

    <div class="page-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="code" label="渠道编码" width="150" />
        <el-table-column prop="name" label="渠道名称" min-width="150" />
        <el-table-column prop="environment" label="环境" width="100">
          <template #default="{ row }">
            <pb-status-tag :status="row.environment" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-status-tag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="成本费率" width="180">
          <template #default="{ row }">
            <pb-rate-display
              :percentage-fee="row.costPercentageFee"
              :fixed-fee="row.costFixedFee"
              :minimum-fee="row.costMinimumFee"
              :show-tooltip="false"
            />
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary">编辑</el-button>
            <el-button link type="warning">
              {{ row.status === 'ENABLED' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { topupChannelApi } from '@paybridge/shared-api';
import { PbStatusTag } from '@paybridge/shared-ui';
import { PbRateDisplay } from '@paybridge/shared-biz';

const loading = ref(false);
const list = ref([]);

onMounted(async () => {
  loading.value = true;
  try {
    const result = await topupChannelApi.list();
    list.value = result.items;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
});
</script>
