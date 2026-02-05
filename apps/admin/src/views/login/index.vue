<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="flex-c absolute right-5 top-3">
      <!-- 主题切换按钮 -->
      <el-switch
        v-model="dataTheme"
        inline-prompt
        :active-icon="DayIcon"
        :inactive-icon="DarkIcon"
        @change="dataThemeChange"
      />
    </div>
    <div class="login-container">
      <div class="img">
        <component :is="toRaw(illustration)" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <avatar class="avatar" />
          <Motion>
            <h2 class="outline-none">PayBridge Admin</h2>
          </Motion>

          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            :rules="loginRules"
            size="large"
          >
            <Motion :delay="100">
              <el-form-item
                :rules="[{ required: true, message: '请输入邮箱', trigger: 'blur' }]"
                prop="email"
              >
                <el-input
                  v-model="ruleForm.email"
                  clearable
                  placeholder="邮箱"
                  :prefix-icon="useRenderIcon(User)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="150">
              <el-form-item prop="password">
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  placeholder="密码"
                  :prefix-icon="useRenderIcon(Lock)"
                />
              </el-form-item>
            </Motion>

            <Motion v-if="showTwoFactor" :delay="200">
              <el-form-item prop="twoFactorCode">
                <el-input
                  v-model="ruleForm.twoFactorCode"
                  clearable
                  placeholder="两步验证码"
                  maxlength="6"
                  :prefix-icon="useRenderIcon('ep:key')"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="250">
              <el-form-item>
                <el-button
                  class="w-full"
                  size="default"
                  type="primary"
                  :loading="loading"
                  @click="onLogin(ruleFormRef)"
                >
                  登录
                </el-button>
              </el-form-item>
            </Motion>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, toRaw, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import type { FormInstance } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { initRouter } from "@/router/utils";
import { useUserStoreHook } from "@/store/modules/user";

import Motion from "./utils/motion";
import avatar from "@/assets/login/avatar.svg?component";
import illustration from "@/assets/login/illustration.svg?component";
import bg from "@/assets/login/bg.png";
import User from "@iconify-icons/ri/user-3-fill";
import Lock from "@iconify-icons/ri/lock-fill";
import DayIcon from "@iconify-icons/ri/sun-fill";
import DarkIcon from "@iconify-icons/ri/moon-fill";

defineOptions({
  name: "Login"
});

const router = useRouter();
const loading = ref(false);
const showTwoFactor = ref(false);
const ruleFormRef = ref<FormInstance>();

const { dataTheme, dataThemeChange } = useDataThemeChange();

const ruleForm = reactive({
  email: "",
  password: "",
  twoFactorCode: ""
});

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(async valid => {
    if (valid) {
      loading.value = true;
      try {
        const result = await useUserStoreHook().loginByEmail(
          ruleForm.email,
          ruleForm.password,
          ruleForm.twoFactorCode || undefined
        );

        if (result?.requireTwoFactor) {
          showTwoFactor.value = true;
          message("请输入两步验证码", { type: "info" });
          return;
        }

        await initRouter();
        message("登录成功", { type: "success" });
        router.push("/");
      } catch (error: unknown) {
        const err = error as { message?: string };
        message(err?.message || "登录失败", { type: "error" });
      } finally {
        loading.value = false;
      }
    }
  });
};

/** 使用公共函数，避免 polyfill 要求 */
function onkeypress({ code }: KeyboardEvent) {
  if (["Enter", "NumpadEnter"].includes(code)) {
    onLogin(ruleFormRef.value);
  }
}

onMounted(() => {
  window.document.addEventListener("keypress", onkeypress);
});

onBeforeUnmount(() => {
  window.document.removeEventListener("keypress", onkeypress);
});
</script>

<style scoped>
@import url("@/style/login.css");
</style>
