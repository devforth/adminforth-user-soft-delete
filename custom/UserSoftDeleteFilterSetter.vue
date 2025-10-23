<template>

</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { AdminForthFilterOperators } from '@/types/Common';
import adminforth from "@/adminforth"
import { useFiltersStore } from '@/stores/filters';

const filtersStore = useFiltersStore();

onMounted(async () => {
    filtersStore.setFilter({
        field: props.meta.field,
        operator: AdminForthFilterOperators.EQ,
        value: true,
    });
});
const props = defineProps<{
    meta: any
}>();
</script>