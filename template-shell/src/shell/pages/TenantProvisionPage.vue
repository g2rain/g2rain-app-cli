<template>
  <div class="tenant-provision-container">
    <el-card class="form-card" shadow="never">
      <!-- 头部 -->
      <template #header>
        <div class="card-header">
          <span class="title">{{ '账号开通设置' }}</span>
        </div>
      </template>

      <!-- 折叠面板主体（join/create 互斥展开） -->
      <!-- 当为运营机构(admin=true)时，禁止任何租户操作 -->
      <el-alert
        v-if="!canProvision"
        type="warning"
        show-icon
        :title="'当前为运营机构账号，不允许加入或创建任何租户'"
        class="provision-alert"
      />
      <el-collapse
        v-else
        v-model="activeCollapse"
        accordion
        class="provision-collapse"
      >
        <!-- 加入机构 -->
        <el-collapse-item name="join">
          <template #title>
            <span :class="['collapse-title', activeCollapse === 'join' && 'collapse-title--active']">
              {{ '加入机构' }}
            </span>
          </template>
          <el-form
            ref="joinFormRef"
            :model="joinForm"
            :rules="joinRules"
            label-position="top"
            class="provision-form"
          >
            <el-form-item :label="'机构邀请码'" prop="inviteCode">
              <el-input
                v-model="joinForm.inviteCode"
                :placeholder="'请输入机构邀请码'"
                maxlength="64"
                show-word-limit
              />
            </el-form-item>

            <div class="form-actions">
              <el-button
                type="primary"
                size="large"
                class="submit-btn"
                :disabled="!canProvision"
                :loading="joinSubmitting"
                @click="submitJoin"
              >
                {{ '加入机构' }}
              </el-button>
            </div>
          </el-form>
        </el-collapse-item>

        <!-- 创建新机构 -->
        <el-collapse-item name="create">
          <template #title>
            <span :class="['collapse-title', activeCollapse === 'create' && 'collapse-title--active']">
              {{ '创建新机构' }}
            </span>
          </template>
          <el-form
            ref="editFormRef"
            :model="editForm"
            :rules="editRules"
            label-position="top"
            class="provision-form"
          >
            <el-form-item :label="'机构类型'" prop="organType">
              <el-select
                v-model="editForm.organType"
                :placeholder="'请选择机构类型'"
                style="width: 100%"
              >
                <el-option
                  v-for="item in typeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item :label="'机构名称'" prop="organName">
              <el-input
                v-model="editForm.organName"
                :placeholder="'请输入机构名称'"
              />
            </el-form-item>

            <el-form-item :label="'姓名'" prop="realName">
              <el-input
                v-model="editForm.realName"
                :placeholder="'请输入姓名'"
              />
            </el-form-item>

            <el-form-item :label="'邮箱地址'" prop="email">
              <el-input
                v-model="editForm.email"
                :placeholder="'请输入邮箱地址'"
              />
            </el-form-item>

            <el-form-item :label="'手机号码'" prop="mobile">
              <el-input
                v-model="editForm.mobile"
                :placeholder="'请输入手机号码'"
              />
            </el-form-item>

            <!-- 底部操作按钮 -->
            <div class="form-actions">
              <el-button
                type="primary"
                size="large"
                class="submit-btn"
                :disabled="!canProvision"
                @click="submitEdit"
              >
                {{ '开通' }}
              </el-button>
            </div>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { getAuthorityUser } from '../../runtime/api/authority-user'
import { sso } from '../../runtime/auth/sso'
import type { TenantProvisionPayload } from './tenant_provision/type'
import { TenantProvisionApi } from './tenant_provision/api'

const activeCollapse = ref<'join' | 'create'>('join')
const canProvision = ref(true)
const joinSubmitting = ref(false)

const typeOptions = computed(() => [
  { label: '租户', value: 'TENANT' },
  { label: '公司', value: 'COMPANY' },
  { label: '渠道商', value: 'SALES_PARTNER' },
  { label: '服务商', value: 'SERVICE_PROVIDER' },
])

  // 加入机构表单
const joinFormRef = ref<FormInstance | null>(null);
const joinForm = reactive({
  inviteCode: '',
});

const joinRules = computed<FormRules>(() => ({
  inviteCode: [
    { required: true, message: '请输入机构邀请码', trigger: 'blur' },
    {
      pattern: /^[0-9a-fA-F-]{32,64}$/,
      message: '请输入有效的机构邀请码',
      trigger: 'blur',
    },
  ],
}));

  // 创建新机构表单引用
const editFormRef = ref<FormInstance | null>(null);
  // 保存表单状态
const editForm = reactive({
  organType: '',
  organName: '',
  realName: '',
  email: '',
  mobile: '',
});

// 表单校验规则
const editRules = computed<FormRules>(() => ({
  organType: [{ required: true, message: '请选择机构类型', trigger: 'blur' }],
  organName: [{ required: true, message: '请输入机构名称', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{ required: false, message: '请输入邮箱地址', trigger: 'blur' }],
  mobile: [{ required: false, message: '请输入手机号码', trigger: 'blur' }],
}));

  // 提交加入机构表单
const submitJoin = async () => {
  if (!joinFormRef.value) return;
  const valid = await joinFormRef.value.validate();
  if (!valid) return;

  joinSubmitting.value = true;
    // 先准备字典
  try {
    const user = await TenantProvisionApi.joinOrgan({
      inviteCode: joinForm.inviteCode.trim(),
    });
    await sso.switchToken(user.id);
    ElMessage.success('加入机构成功');
    setTimeout(() => window.location.reload(), 300);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '加入机构失败';
    ElMessage.error(msg);
  } finally {
    joinSubmitting.value = false;
  }
};

  // 提交创建新机构表单
const submitEdit = async () => {
  if (!editFormRef.value) return;
  const valid = await editFormRef.value.validate();
  if (!valid) return;

  const payload: TenantProvisionPayload = {
    organType: editForm.organType,
    organName: editForm.organName,
    realName: editForm.realName,
    email: editForm.email,
    mobile: editForm.mobile,
  };

  try {
    const user = await TenantProvisionApi.provisionAccount(payload);
      // 开通成功后切换/刷新 token，并重置菜单
    await sso.switchToken(user.id);
    ElMessage.success('开通成功');
    setTimeout(() => window.location.reload(), 300);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '开通失败';
    ElMessage.error(msg);
  }
};

  // 挂载回调
onMounted(async () => {
    // 根据当前登录用户的机构信息判断是否允许开通/加入租户
  try {
    const authorityUser = await getAuthorityUser();
      // 当所属机构 organ.admin 为 true（运营机构）时，不允许任何租户操作
    canProvision.value = !authorityUser.organ?.admin;
  } catch (error: unknown) {
    console.error('加载当前用户信息失败:', error);
      // 出错时默认允许
  }
});
</script>

<style scoped>
.tenant-provision-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100%;
  box-sizing: border-box;
}

.form-card {
  width: 100%;
  background-color: #fff;
}

.card-header {
  font-weight: bold;
  font-size: 18px;
}

.collapse-title {
  font-size: 14px;
  color: #606266;
}

.collapse-title--active {
  color: #409eff;
  font-weight: 600;
}

.provision-form {
  padding: 10px 20px;
}

.form-actions {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  text-align: center;
}

.submit-btn {
  width: 160px;
}

.provision-alert {
  margin-bottom: 16px;
}
</style>
