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
    header="Deactivate user"
    :buttons="[
        { label: 'Confirm', onclick: (dialog) => { deactivateUser(); dialog.hide(); } },
        { label: 'Cancel', onclick: (dialog) => dialog.hide() },
    ]"
    >
    <div class="space-y-4">
        <p>Are you sure you want to deactivate this user?</p>
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
        adminforth.alert({message: `Error deactivating user. ${e}`, variant: "warning"});
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
