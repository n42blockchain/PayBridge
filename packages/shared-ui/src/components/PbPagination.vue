<template>
  <div class="pb-pagination">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentPageSize"
      :page-sizes="pageSizes"
      :total="total"
      :layout="layout"
      :background="background"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElPagination } from 'element-plus';

const props = withDefaults(
  defineProps<{
    page: number;
    pageSize: number;
    total: number;
    pageSizes?: number[];
    layout?: string;
    background?: boolean;
  }>(),
  {
    pageSizes: () => [10, 20, 50, 100],
    layout: 'total, sizes, prev, pager, next, jumper',
    background: true,
  },
);

const emit = defineEmits<{
  (e: 'update:page', value: number): void;
  (e: 'update:pageSize', value: number): void;
  (e: 'change', page: number, pageSize: number): void;
}>();

const currentPage = computed({
  get: () => props.page,
  set: (value) => emit('update:page', value),
});

const currentPageSize = computed({
  get: () => props.pageSize,
  set: (value) => emit('update:pageSize', value),
});

function handleSizeChange(size: number) {
  emit('update:pageSize', size);
  emit('update:page', 1);
  emit('change', 1, size);
}

function handleCurrentChange(page: number) {
  emit('update:page', page);
  emit('change', page, props.pageSize);
}
</script>

<style scoped>
.pb-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
}
</style>
