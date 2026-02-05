<template>
  <div class="main-content">
    <el-card shadow="never">
      <template #header>
        <span class="font-bold text-lg">系统设置</span>
      </template>

      <el-tabs v-model="activeTab">
        <!-- General Settings -->
        <el-tab-pane label="基础设置" name="general">
          <el-form
            ref="generalFormRef"
            :model="generalForm"
            label-width="140px"
            class="max-w-[600px]"
          >
            <el-form-item label="系统名称">
              <el-input v-model="generalForm.systemName" />
            </el-form-item>
            <el-form-item label="维护模式">
              <el-switch v-model="generalForm.maintenanceMode" />
              <span class="ml-4 text-gray-500 text-sm">
                开启后前端将显示维护公告
              </span>
            </el-form-item>
            <el-form-item label="默认货币">
              <el-select v-model="generalForm.defaultCurrency" class="w-full">
                <el-option label="人民币 (CNY)" value="CNY" />
                <el-option label="美元 (USD)" value="USD" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveGeneralSettings">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Fee Settings -->
        <el-tab-pane label="费率设置" name="fee">
          <el-form
            ref="feeFormRef"
            :model="feeForm"
            label-width="140px"
            class="max-w-[600px]"
          >
            <el-form-item label="默认充值费率">
              <el-input-number
                v-model="feeForm.defaultTopupFeeRate"
                :min="0"
                :max="100"
                :precision="2"
                :step="0.1"
              />
              <span class="ml-2">%</span>
            </el-form-item>
            <el-form-item label="默认兑付费率">
              <el-input-number
                v-model="feeForm.defaultSettlementFeeRate"
                :min="0"
                :max="100"
                :precision="2"
                :step="0.1"
              />
              <span class="ml-2">%</span>
            </el-form-item>
            <el-form-item label="最低提现金额">
              <el-input-number
                v-model="feeForm.minWithdrawAmount"
                :min="0"
                :precision="2"
              />
              <span class="ml-2">USDT</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveFeeSettings">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Blockchain Settings -->
        <el-tab-pane label="区块链设置" name="blockchain">
          <el-form
            ref="blockchainFormRef"
            :model="blockchainForm"
            label-width="180px"
            class="max-w-[700px]"
          >
            <el-form-item label="RPC 节点地址">
              <el-input v-model="blockchainForm.rpcUrl" placeholder="https://" />
            </el-form-item>
            <el-form-item label="区块确认数">
              <el-input-number
                v-model="blockchainForm.confirmations"
                :min="1"
                :max="100"
              />
            </el-form-item>
            <el-form-item label="Gas 价格倍数">
              <el-input-number
                v-model="blockchainForm.gasPriceMultiplier"
                :min="1"
                :max="10"
                :precision="1"
                :step="0.1"
              />
              <span class="ml-2">x</span>
            </el-form-item>
            <el-form-item label="Gas 钱包预警阈值">
              <el-input-number
                v-model="blockchainForm.gasAlertThreshold"
                :min="0"
                :precision="4"
              />
              <span class="ml-2">ETH</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveBlockchainSettings">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Notification Settings -->
        <el-tab-pane label="通知设置" name="notification">
          <el-form
            ref="notificationFormRef"
            :model="notificationForm"
            label-width="140px"
            class="max-w-[600px]"
          >
            <el-form-item label="邮件通知">
              <el-switch v-model="notificationForm.emailEnabled" />
            </el-form-item>
            <el-form-item label="SMTP 服务器">
              <el-input
                v-model="notificationForm.smtpHost"
                placeholder="smtp.example.com"
                :disabled="!notificationForm.emailEnabled"
              />
            </el-form-item>
            <el-form-item label="SMTP 端口">
              <el-input-number
                v-model="notificationForm.smtpPort"
                :min="1"
                :max="65535"
                :disabled="!notificationForm.emailEnabled"
              />
            </el-form-item>
            <el-form-item label="发件人邮箱">
              <el-input
                v-model="notificationForm.smtpFrom"
                placeholder="noreply@example.com"
                :disabled="!notificationForm.emailEnabled"
              />
            </el-form-item>
            <el-divider />
            <el-form-item label="Webhook 通知">
              <el-switch v-model="notificationForm.webhookEnabled" />
            </el-form-item>
            <el-form-item label="Webhook URL">
              <el-input
                v-model="notificationForm.webhookUrl"
                placeholder="https://"
                :disabled="!notificationForm.webhookEnabled"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveNotificationSettings">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { settingApi } from "@paybridge/shared-api";

defineOptions({
  name: "SystemSetting"
});

const activeTab = ref("general");

const generalForm = reactive({
  systemName: "PayBridge",
  maintenanceMode: false,
  defaultCurrency: "CNY"
});

const feeForm = reactive({
  defaultTopupFeeRate: 1.0,
  defaultSettlementFeeRate: 0.5,
  minWithdrawAmount: 100
});

const blockchainForm = reactive({
  rpcUrl: "",
  confirmations: 12,
  gasPriceMultiplier: 1.2,
  gasAlertThreshold: 0.1
});

const notificationForm = reactive({
  emailEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpFrom: "",
  webhookEnabled: false,
  webhookUrl: ""
});

async function loadSettings() {
  try {
    const settings = await settingApi.list();
    if (settings) {
      // Parse settings from list
      for (const setting of settings) {
        if (setting.key.startsWith("general.")) {
          const key = setting.key.replace("general.", "");
          (generalForm as any)[key] = setting.value;
        } else if (setting.key.startsWith("fee.")) {
          const key = setting.key.replace("fee.", "");
          (feeForm as any)[key] = setting.value;
        } else if (setting.key.startsWith("blockchain.")) {
          const key = setting.key.replace("blockchain.", "");
          (blockchainForm as any)[key] = setting.value;
        } else if (setting.key.startsWith("notification.")) {
          const key = setting.key.replace("notification.", "");
          (notificationForm as any)[key] = setting.value;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

async function saveGeneralSettings() {
  try {
    await settingApi.update("general", generalForm);
    message("基础设置已保存", { type: "success" });
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "保存失败", { type: "error" });
  }
}

async function saveFeeSettings() {
  try {
    await settingApi.update("fee", feeForm);
    message("费率设置已保存", { type: "success" });
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "保存失败", { type: "error" });
  }
}

async function saveBlockchainSettings() {
  try {
    await settingApi.update("blockchain", blockchainForm);
    message("区块链设置已保存", { type: "success" });
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "保存失败", { type: "error" });
  }
}

async function saveNotificationSettings() {
  try {
    await settingApi.update("notification", notificationForm);
    message("通知设置已保存", { type: "success" });
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "保存失败", { type: "error" });
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style lang="scss" scoped>
.main-content {
  margin: 20px;
}
</style>
