import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { createHttpClient } from '@paybridge/shared-api';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

import 'element-plus/dist/index.css';
import './styles/index.scss';

const app = createApp(App);

// Pinia
const pinia = createPinia();
app.use(pinia);

// Initialize HTTP client
createHttpClient({
  baseURL: '',
  getToken: () => {
    const authStore = useAuthStore();
    return authStore.accessToken;
  },
  onUnauthorized: () => {
    const authStore = useAuthStore();
    authStore.logout();
    router.push('/login');
  },
});

// Element Plus
app.use(ElementPlus, { locale: zhCn });

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// Router
app.use(router);

app.mount('#app');
