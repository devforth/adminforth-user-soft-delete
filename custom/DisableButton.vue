<template>
  <div class="flex items-end justify-start gap-2 cursor-pointer" @click="openDialog()">
    <p class="text-justify max-h-[18px] truncate max-w-[60vw] md:max-w-none">Deactivate user</p>
  </div>
    <Dialog
    ref="confirmDialog"
    class="w-96"
    header="Deactivate user"
    :buttons="[
        { label: 'Confirm', onclick: (dialog) => { console.log('Confirmed'); dialog.hide(); } },
        { label: 'Cancel', onclick: (dialog) => dialog.hide() },
    ]"
    >
    <div class="space-y-4">
        <p>Are you sure you want to deactivate this user?</p>
    </div>
    </Dialog>
</template>

<script lang="ts" setup>
import { Dialog } from '@/afcl';
import { ref, watch } from 'vue';
import { AdminUser, type AdminForthResourceCommon } from '@/types';

const confirmDialog = ref(null);

function openDialog() {
    confirmDialog.value.open()
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


watch(props.checkboxes, (newVal) => {
    // Handle checkbox changes
    console.log("New checkboxes:", newVal)
});


</script>
