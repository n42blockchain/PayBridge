<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">网关配置</h1>
    </div>

    <el-card v-loading="loading" class="page-card">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="商户编码">
          <code>{{ merchant?.merchantCode }}</code>
          <el-button type="primary" size="small" link @click="copyToClipboard(merchant?.merchantCode)">
            复制
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="API Key">
          <code>{{ merchant?.config?.apiKey }}</code>
          <el-button type="primary" size="small" link @click="copyToClipboard(merchant?.config?.apiKey)">
            复制
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="API Secret">
          <span class="secret-mask">********************************</span>
          <el-button type="warning" size="small" @click="handleResetSecret">
            重置密钥
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="签名算法">
          {{ merchant?.config?.encryptionAlgorithm }}
        </el-descriptions-item>
        <el-descriptions-item label="回调地址">
          {{ merchant?.callbackUrl || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="page-card">
      <template #header>接入说明</template>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          请使用商户编码 (X-Merchant-Id) 和 API Key/Secret 进行接口签名认证。
        </template>
      </el-alert>
      <div class="mt-4">
        <h4>请求头示例：</h4>
        <pre class="code-block">
X-Merchant-Id: {{ merchant?.merchantCode }}
X-Timestamp: 1706900000000
X-Nonce: random_string_32_chars
X-Sign-Type: HMAC
X-Signature: base64_encoded_signature
        </pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { merchantApi } from '@paybridge/shared-api';
import type { MerchantDetailDto } from '@paybridge/shared-types';

const loading = ref(true);
const merchant = ref<MerchantDetailDto | null>(null);

onMounted(async () => {
  try {
    merchant.value = await merchantApi.getMe();
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
});

async function handleResetSecret() {
  if (!merchant.value) return;

  try {
    await ElMessageBox.confirm(
      '重置后原有密钥将立即失效，确定要重置吗？',
      '警告',
      { type: 'warning' },
    );

    const result = await merchantApi.resetApiSecret(merchant.value.id);

    await ElMessageBox.alert(
      `新的 API Key: ${result.apiKey}\n新的 API Secret: ${result.apiSecret}\n\n请妥善保存，Secret 仅显示一次！`,
      '密钥已重置',
      { type: 'success' },
    );

    merchant.value = await merchantApi.getMe();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '重置失败');
    }
  }
}

async function copyToClipboard(text?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制');
  } catch {
    ElMessage.error('复制失败');
  }
}
</script>

<style scoped>
.secret-mask {
  font-family: monospace;
  color: #909399;
  margin-right: 12px;
}

.code-block {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  overflow-x: auto;
}
</style>
