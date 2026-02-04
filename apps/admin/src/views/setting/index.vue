<template>
  <div class="settings">
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
    </div>

    <el-card class="page-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本设置" name="basic">
          <el-form label-width="160px" style="max-width: 600px">
            <el-form-item label="强制启用两步验证">
              <el-switch v-model="settings.force2FA" @change="updateSetting('security.force_2fa', settings.force2FA)" />
              <span class="form-tip">启用后，所有用户必须设置两步验证</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="汇率设置" name="rate">
          <el-form label-width="160px" style="max-width: 600px">
            <el-form-item label="充值汇率 (法币→代币)">
              <el-input-number
                v-model="settings.topupExchangeRate"
                :precision="8"
                :step="0.01"
                :min="0"
              />
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('topup.exchange_rate', settings.topupExchangeRate)">
                保存
              </el-button>
            </el-form-item>
            <el-form-item label="兑付汇率 (代币→USDT)">
              <el-input-number
                v-model="settings.settlementExchangeRate"
                :precision="8"
                :step="0.01"
                :min="0"
              />
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('settlement.exchange_rate', settings.settlementExchangeRate)">
                保存
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="订单设置" name="order">
          <el-form label-width="160px" style="max-width: 600px">
            <el-form-item label="默认订单超时时间">
              <el-input-number
                v-model="settings.topupDefaultTimeout"
                :min="5"
                :max="120"
              />
              <span class="form-unit">分钟</span>
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('topup.default_timeout_minutes', settings.topupDefaultTimeout)">
                保存
              </el-button>
            </el-form-item>
            <el-form-item label="回调最大重试次数">
              <el-input-number
                v-model="settings.callbackMaxRetries"
                :min="1"
                :max="20"
              />
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('callback.max_retries', settings.callbackMaxRetries)">
                保存
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="区块链设置" name="blockchain">
          <el-form label-width="160px" style="max-width: 600px">
            <el-form-item label="确认数要求">
              <el-input-number
                v-model="settings.requiredConfirmations"
                :min="1"
                :max="100"
              />
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('blockchain.required_confirmations', settings.requiredConfirmations)">
                保存
              </el-button>
            </el-form-item>
            <el-form-item label="Gas 告警阈值">
              <el-input-number
                v-model="settings.gasThreshold"
                :precision="4"
                :step="0.1"
                :min="0"
              />
              <span class="form-unit">ETH</span>
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('blockchain.gas_threshold', settings.gasThreshold)">
                保存
              </el-button>
            </el-form-item>
            <el-form-item label="Gas 补充金额">
              <el-input-number
                v-model="settings.gasSupplementAmount"
                :precision="4"
                :step="0.1"
                :min="0"
              />
              <span class="form-unit">ETH</span>
              <el-button type="primary" size="small" class="ml-2" @click="updateSetting('blockchain.gas_supplement_amount', settings.gasSupplementAmount)">
                保存
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { settingApi } from '@paybridge/shared-api';

const activeTab = ref('basic');
const settings = reactive({
  force2FA: false,
  topupExchangeRate: 1,
  settlementExchangeRate: 1,
  topupDefaultTimeout: 30,
  callbackMaxRetries: 7,
  requiredConfirmations: 6,
  gasThreshold: 0.1,
  gasSupplementAmount: 0.5,
});

onMounted(async () => {
  try {
    const allSettings = await settingApi.list();
    for (const setting of allSettings) {
      switch (setting.key) {
        case 'security.force_2fa':
          settings.force2FA = setting.value as boolean;
          break;
        case 'topup.exchange_rate':
          settings.topupExchangeRate = setting.value as number;
          break;
        case 'settlement.exchange_rate':
          settings.settlementExchangeRate = setting.value as number;
          break;
        case 'topup.default_timeout_minutes':
          settings.topupDefaultTimeout = setting.value as number;
          break;
        case 'callback.max_retries':
          settings.callbackMaxRetries = setting.value as number;
          break;
        case 'blockchain.required_confirmations':
          settings.requiredConfirmations = setting.value as number;
          break;
        case 'blockchain.gas_threshold':
          settings.gasThreshold = setting.value as number;
          break;
        case 'blockchain.gas_supplement_amount':
          settings.gasSupplementAmount = setting.value as number;
          break;
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载设置失败');
  }
});

async function updateSetting(key: string, value: unknown) {
  try {
    await settingApi.update(key, value);
    ElMessage.success('设置已保存');
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
}
</script>

<style scoped>
.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.form-unit {
  margin-left: 8px;
  color: #606266;
}

.ml-2 {
  margin-left: 8px;
}
</style>
