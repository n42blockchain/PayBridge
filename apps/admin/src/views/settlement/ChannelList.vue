<template>
  <div class="channel-list">
    <div class="page-header">
      <h1 class="page-title">兑付渠道</h1>
      <el-button type="primary">
        <el-icon><Plus /></el-icon>
        新建渠道
      </el-button>
    </div>

    <div class="page-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="code" label="渠道编码" width="150" />
        <el-table-column prop="name" label="渠道名称" min-width="150" />
        <el-table-column prop="mode" label="模式" width="120">
          <template #default="{ row }">
            <el-tag :type="row.mode === 'ONCHAIN_TRANSFER' ? 'success' : 'primary'">
              {{ row.mode === 'ONCHAIN_TRANSFER' ? '链上转账' : 'API集成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <pb-status-tag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="费率" width="180">
          <template #default="{ row }">
            <pb-rate-display
              :percentage-fee="row.percentageFee"
              :fixed-fee="row.fixedFee"
              :minimum-fee="row.minimumFee"
              :show-tooltip="false"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default>
            <el-button link type="primary">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { settlementChannelApi } from '@paybridge/shared-api';
import { PbStatusTag } from '@paybridge/shared-ui';
import { PbRateDisplay } from '@paybridge/shared-biz';

const loading = ref(false);
const list = ref([]);

onMounted(async () => {
  loading.value = true;
  try {
    const result = await settlementChannelApi.list();
    list.value = result.items;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
});
</script>
