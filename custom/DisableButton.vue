<template>
    <Tooltip>
        <button
            @click="openDialog()"
        >
            <IconUserRemoveSolid class="w-5 h-5 me-2"/>
        </button>

        <template v-slot:tooltip>
            {{ $t('Deactivate user') }}
        </template>
    </Tooltip>
    <Dialog
    ref="confirmDialog"
    class="w-96"
    :header="t('Deactivate user')"
    :buttons="[
        { label: t('Confirm'), onclick: (dialog) => { deactivateUser(); dialog.hide(); } },
        { label: t('Cancel'), onclick: (dialog) => dialog.hide() },
    ]"
    >
    <div class="space-y-4">
        <p>{{ $t('Are you sure you want to deactivate this user?') }}</p>
    </div>
    </Dialog>
</template>

<script lang="ts" setup>
import { Dialog, Tooltip } from '@/afcl';
import { ref } from 'vue';
import { AdminUser, type AdminForthResourceCommon } from '@/types';
import adminforth from "@/adminforth"
import { callAdminForthApi } from '@/utils';
import { IconUserRemoveSolid } from '@iconify-prerendered/vue-flowbite';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const confirmDialog = ref(null);

function openDialog() {
    confirmDialog.value.open();
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
