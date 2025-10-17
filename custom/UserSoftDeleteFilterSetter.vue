<template>

</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { AdminForthFilterOperators } from '@/types/Common';
import adminforth from "@/adminforth"
onMounted(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    adminforth?.list?.updateFilter?.({
        field: props.meta.field,
        operator: AdminForthFilterOperators.EQ,
        value: true,
    });
});
const props = defineProps<{
    meta: any
}>();
</script>