<template>
    <Tooltip>
        <button @click="onClick" class="user-soft-delete-button">
            <IconUserRemoveSolid class="w-5 h-5 me-2"/>
        </button>
        <template #tooltip>
            {{ $t('Deactivate user') }}
        </template>
    </Tooltip>
</template>

<script lang="ts" setup>
import { Tooltip } from '@/afcl';
import { type AdminUser, type AdminForthResourceCommon } from '@/types/Common';
import adminforth from "@/adminforth"
import { callAdminForthApi } from '@/utils';
import { IconUserRemoveSolid } from '@iconify-prerendered/vue-flowbite';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

async function onClick() {
    const confirmed = await adminforth.confirm({
        message: t('Are you sure you want to deactivate this user?'),
        yes: t('Confirm'),
        no: t('Cancel'),
    });
    if (confirmed) {
        await deactivateUser();
    }
}

async function deactivateUser() {
    try {
        const res = await callAdminForthApi({
            path: `/plugin/${props.meta.pluginInstanceId}/deactivateUser`,
            method: 'POST',
            body: {
                record: props.record,
            },
        });
        if (!res || res.ok === false || res.error) {
            if ( res.error ) {
                throw new Error(res.error)
            }
            throw new Error("")
        }
        props.updateRecords();
    } catch (e) {
        adminforth.alert({message: t(`Error deactivating user. ${e}`), variant: "warning"});
    }
}

const props = defineProps<{
    meta: any,
    resource: AdminForthResourceCommon,
    adminUser: AdminUser,
    record: any,
    updateRecords: Function,
}>();


</script>
