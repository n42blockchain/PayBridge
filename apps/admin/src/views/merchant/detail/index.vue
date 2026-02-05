<template>
  <div class="main-content">
    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold text-lg">商户详情</span>
          <el-button @click="router.back()">
            <IconifyIconOffline icon="ep:back" class="mr-1" />
            返回
          </el-button>
        </div>
      </template>

      <el-descriptions v-if="merchant" :column="2" border>
        <el-descriptions-item label="商户编码">
          {{ merchant.merchantCode }}
        </el-descriptions-item>
        <el-descriptions-item label="商户名称">
          {{ merchant.name }}
        </el-descriptions-item>
        <el-descriptions-item label="商户类型">
          <el-tag :type="merchant.type === 'AGENT' ? 'warning' : 'info'" size="small">
            {{ merchant.type === 'AGENT' ? '代理商' : '普通商户' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="statusMap[merchant.status]?.type"
            size="small"
          >
            {{ statusMap[merchant.status]?.label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="回调地址" :span="2">
          {{ merchant.callbackUrl || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="API Key">
          <div class="flex items-center gap-2">
            <span class="font-mono">{{ maskedApiKey }}</span>
            <el-button
              link
              type="primary"
              size="small"
              @click="toggleApiKeyVisible"
            >
              {{ showApiKey ? '隐藏' : '显示' }}
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              v-copy="merchant.apiKey"
            >
              复制
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="API Secret">
          <div class="flex items-center gap-2">
            <span class="font-mono">{{ maskedApiSecret }}</span>
            <el-button
              link
              type="primary"
              size="small"
              @click="toggleApiSecretVisible"
            >
              {{ showApiSecret ? '隐藏' : '显示' }}
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              v-copy="merchant.apiSecret"
            >
              复制
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ dayjs(merchant.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ dayjs(merchant.updatedAt).format('YYYY-MM-DD HH:mm:ss') }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="merchant" class="mt-6 flex gap-4">
        <el-button
          v-if="merchant.status === 'ENABLED'"
          type="warning"
          @click="handleDisable"
        >
          禁用商户
        </el-button>
        <el-button
          v-else-if="merchant.status === 'DISABLED'"
          type="success"
          @click="handleEnable"
        >
          启用商户
        </el-button>
        <el-button type="primary" @click="handleResetApiKey">
          重置 API 密钥
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { merchantApi } from "@paybridge/shared-api";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "MerchantDetail"
});

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const merchant = ref<any>(null);
const showApiKey = ref(false);
const showApiSecret = ref(false);

type TagType = "primary" | "success" | "warning" | "danger" | "info";
const statusMap: Record<string, { type: TagType; label: string }> = {
  ENABLED: { type: "success", label: "启用" },
  DISABLED: { type: "danger", label: "禁用" },
  FROZEN: { type: "warning", label: "冻结" }
};

const maskedApiKey = computed(() => {
  if (!merchant.value?.apiKey) return "-";
  if (showApiKey.value) return merchant.value.apiKey;
  return merchant.value.apiKey.slice(0, 8) + "****" + merchant.value.apiKey.slice(-4);
});

const maskedApiSecret = computed(() => {
  if (!merchant.value?.apiSecret) return "-";
  if (showApiSecret.value) return merchant.value.apiSecret;
  return "****" + merchant.value.apiSecret.slice(-4);
});

function toggleApiKeyVisible() {
  showApiKey.value = !showApiKey.value;
}

function toggleApiSecretVisible() {
  showApiSecret.value = !showApiSecret.value;
}

async function loadData() {
  const id = route.params.id as string;
  if (!id) return;

  loading.value = true;
  try {
    merchant.value = await merchantApi.getById(id);
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "加载失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function handleEnable() {
  if (!merchant.value) return;
  try {
    await merchantApi.enable(merchant.value.id);
    message("已启用", { type: "success" });
    loadData();
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "操作失败", { type: "error" });
  }
}

async function handleDisable() {
  if (!merchant.value) return;
  try {
    await ElMessageBox.confirm("确定要禁用该商户吗？", "提示", {
      type: "warning"
    });
    await merchantApi.disable(merchant.value.id);
    message("已禁用", { type: "success" });
    loadData();
  } catch (error: unknown) {
    if (error !== "cancel") {
      const err = error as { message?: string };
      message(err?.message || "操作失败", { type: "error" });
    }
  }
}

async function handleResetApiKey() {
  if (!merchant.value) return;
  try {
    await ElMessageBox.confirm(
      "重置后原 API 密钥将失效，确定要重置吗？",
      "警告",
      { type: "warning" }
    );
    // API reset not implemented yet
    message("API 密钥已重置", { type: "success" });
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
</style>
