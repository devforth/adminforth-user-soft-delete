<template>
    <div class="flex items-end justify-start gap-2 cursor-pointer" :class="{'opacity-50': checkboxes.length !== 1}">
        <p class="text-justify max-h-[18px] truncate max-w-[60vw] md:max-w-none">Deactivate user</p>
    </div>
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
import { ref, onMounted } from 'vue';
import { AdminUser, type AdminForthResourceCommon } from '@/types';
import adminforth from "@/adminforth"
import { callAdminForthApi } from '@/utils';
import { AdminForthFilterOperators } from '@/types/Common';


const confirmDialog = ref(null);


onMounted(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    adminforth?.list?.updateFilter?.({
        field: props.meta.field,
        operator: AdminForthFilterOperators.EQ,
        value: true,
    });
});

function openDialog() {
    if ( props.checkboxes.length !== 1 ) {
        if (props.checkboxes.length > 1) {
            adminforth.alert({message: "Select only one account to deactivate", variant: "warning"})
        } else {
            adminforth.alert({message: "Select at least one account to deactivate", variant: "warning"})
        }
    } else {
        confirmDialog.value.open()
    }
}

async function deactivateUser() {
    try {
        const res = await callAdminForthApi({
            path: `/plugin/${props.meta.pluginInstanceId}/deactivateUser`,
            method: 'POST',
            body: {
                record: props.checkboxes[0],
            },
        });
        if (!res || res.ok === false || res.error) {
            if ( res.error ) {
                throw new Error(res.error)
            }
            throw new Error("")
        }
        props.updateList();
    } catch (e) {
        adminforth.alert({message: `Error deactivating user. ${e}`, variant: "warning"});
    }
}

const props = defineProps<{
    checkboxes: any,
    meta: any,
    resource: AdminForthResourceCommon,
    adminUser: AdminUser,
    updateList: {
        type: Function,
        required: true
    },
    clearCheckboxes: {
        type: Function
    }
}>();

defineExpose({
  click
});

function click() {
  openDialog();
}


</script>
