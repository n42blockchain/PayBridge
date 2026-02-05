<template>
  <div class="main-content">
    <!-- Stats Cards -->
    <el-row :gutter="24" class="mb-[24px]">
      <el-col
        v-for="(item, index) in statsCards"
        :key="index"
        :xs="24"
        :sm="12"
        :md="12"
        :lg="6"
        :xl="6"
        class="mb-[18px]"
      >
        <el-card class="line-card" shadow="never">
          <div class="flex justify-between">
            <div>
              <span class="text-md text-[#909399]">{{ item.title }}</span>
              <div class="flex items-end mt-2">
                <span
                  class="text-2xl font-bold"
                  :class="getValueColorClass(item.valueType)"
                >
                  {{ item.prefix }}{{ item.value }}{{ item.suffix }}
                </span>
                <span
                  v-if="item.change"
                  class="ml-2 text-sm"
                  :class="getChangeColorClass(item.changeType)"
                >
                  {{ item.change }}
                </span>
              </div>
            </div>
            <div
              class="w-[56px] h-[56px] rounded-full flex justify-center items-center"
              :class="getIconBgClass(item.iconColor)"
            >
              <IconifyIconOffline :icon="item.icon" width="28" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- System Wallets -->
    <el-card class="mb-[24px]" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold">系统钱包</span>
          <el-button type="primary" size="small" @click="handleInitWallets">
            <IconifyIconOffline icon="ep:plus" class="mr-1" />
            初始化钱包
          </el-button>
        </div>
      </template>

      <el-row :gutter="24">
        <el-col :span="12">
          <div class="wallet-item">
            <div class="wallet-label">资金池地址</div>
            <div class="wallet-value">
              <span v-if="walletSummary?.fundPool" class="text-primary">
                {{ walletSummary.fundPool.address }}
              </span>
              <el-tag v-else type="warning">未初始化</el-tag>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="wallet-item">
            <div class="wallet-label">资金池余额</div>
            <div class="wallet-value font-bold text-lg">
              <span v-if="walletSummary?.fundPool">
                {{ walletSummary.fundPool.balance }} TOKEN
              </span>
              <span v-else class="text-gray-400">-</span>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="wallet-item mt-4">
            <div class="wallet-label">Gas 钱包地址</div>
            <div class="wallet-value">
              <span v-if="walletSummary?.gas" class="text-primary">
                {{ walletSummary.gas.address }}
              </span>
              <el-tag v-else type="warning">未初始化</el-tag>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="wallet-item mt-4">
            <div class="wallet-label">Gas 余额</div>
            <div class="wallet-value font-bold text-lg">
              <span v-if="walletSummary?.gas">
                {{ walletSummary.gas.nativeBalance }} ETH
              </span>
              <span v-else class="text-gray-400">-</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- Quick Actions -->
    <el-card shadow="never">
      <template #header>
        <span class="font-bold">快捷操作</span>
      </template>
      <div class="flex flex-wrap gap-4">
        <el-button
          v-for="action in quickActions"
          :key="action.path"
          :type="action.type"
          @click="$router.push(action.path)"
        >
          <IconifyIconOffline :icon="action.icon" class="mr-1" />
          {{ action.label }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import { walletApi } from "@paybridge/shared-api";
import {
  WalletType,
  ChainNetwork,
  type WalletBalanceSummary
} from "@paybridge/shared-types";

defineOptions({
  name: "Dashboard"
});

const walletSummary = ref<WalletBalanceSummary | null>(null);

const statsCards = ref([
  {
    title: "今日充值",
    value: "125,800.00",
    prefix: "¥ ",
    suffix: "",
    change: "+12.5%",
    changeType: "success",
    valueType: "primary",
    icon: "ep:money",
    iconColor: "primary"
  },
  {
    title: "今日兑付",
    value: "18,500.00",
    prefix: "$ ",
    suffix: "",
    change: "+8.3%",
    changeType: "success",
    valueType: "success",
    icon: "ep:coin",
    iconColor: "success"
  },
  {
    title: "活跃商户",
    value: "156",
    prefix: "",
    suffix: "",
    change: "+3",
    changeType: "success",
    valueType: "warning",
    icon: "ep:shop",
    iconColor: "warning"
  },
  {
    title: "待审核",
    value: "8",
    prefix: "",
    suffix: "",
    change: "需处理",
    changeType: "warning",
    valueType: "danger",
    icon: "ep:bell",
    iconColor: "danger"
  }
]);

const quickActions: Array<{
  path: string;
  label: string;
  icon: string;
  type: "" | "primary" | "success" | "warning" | "danger" | "info";
}> = [
  { path: "/merchant/list", label: "新建商户", icon: "ep:shop", type: "" },
  {
    path: "/topup/channel",
    label: "配置渠道",
    icon: "ep:wallet",
    type: "primary"
  },
  {
    path: "/settlement/order",
    label: "审核兑付",
    icon: "ep:document",
    type: "success"
  },
  {
    path: "/setting/index",
    label: "系统设置",
    icon: "ep:setting",
    type: "warning"
  }
];

const getValueColorClass = (type: string) => {
  const map: Record<string, string> = {
    primary: "text-primary",
    success: "text-green-500",
    warning: "text-orange-500",
    danger: "text-red-500"
  };
  return map[type] || "";
};

const getChangeColorClass = (type: string) => {
  const map: Record<string, string> = {
    success: "text-green-500",
    warning: "text-orange-500",
    danger: "text-red-500"
  };
  return map[type] || "";
};

const getIconBgClass = (color: string) => {
  const map: Record<string, string> = {
    primary: "bg-blue-100 text-primary",
    success: "bg-green-100 text-green-500",
    warning: "bg-orange-100 text-orange-500",
    danger: "bg-red-100 text-red-500"
  };
  return map[color] || "bg-gray-100";
};

onMounted(async () => {
  try {
    walletSummary.value = await walletApi.getSystemSummary(
      ChainNetwork.PAYBRIDGE
    );
  } catch (error) {
    console.error("Failed to load wallet summary:", error);
  }
});

async function handleInitWallets() {
  try {
    await walletApi.create({
      type: WalletType.FUND_POOL,
      chain: ChainNetwork.PAYBRIDGE,
      label: "Main Fund Pool"
    });

    await walletApi.create({
      type: WalletType.GAS,
      chain: ChainNetwork.PAYBRIDGE,
      label: "Gas Wallet"
    });

    message("系统钱包初始化成功", { type: "success" });
    walletSummary.value = await walletApi.getSystemSummary(
      ChainNetwork.PAYBRIDGE
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    message(err?.message || "初始化失败", { type: "error" });
  }
}
</script>

<style lang="scss" scoped>
.main-content {
  margin: 20px;
}

.line-card {
  border-radius: 8px;
}

.wallet-item {
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.wallet-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 8px;
}

.wallet-value {
  font-size: 14px;
  word-break: break-all;
}

.text-primary {
  color: var(--el-color-primary);
}
</style>
