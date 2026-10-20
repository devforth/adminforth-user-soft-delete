<template>
    <Tooltip>
        <Button
            class="af-user-soft-delete-button"
            variant="ghost"
            size="sm"
            iconOnly
            @click="onClick"
        >
            <IconUserX />
        </Button>
        <template #tooltip>
            {{ $t('Deactivate user') }}
        </template>
    </Tooltip>
</template>

<script lang="ts" setup>
import { Button, Tooltip } from '@/afcl';
import { type AdminUser, type AdminForthResourceCommon } from '@/types/Common';
import adminforth from "@/adminforth"
import { callAdminForthApi } from '@/utils';
import { IconUserX } from '@iconify-prerendered/vue-lucide';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

async function onClick() {
    const confirmed = await adminforth.confirm({
        title: t('Are you sure you want to deactivate this user?'),
        message: t('The user will not be able to log in.'),
        yes: t('Deactivate'),
        no: t('Cancel'),
        dangerous: true,
        icon: IconUserX,
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
        adminforth.alert({message: t(`Error deactivating user. ${e}`), variant: "danger"});
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
