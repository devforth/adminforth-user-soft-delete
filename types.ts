import type { AdminUser } from "adminforth";

export interface PluginOptions {
    activeFieldName: string; 
    canDeactivate?: (adminUser: AdminUser) => Promise<boolean>;
}
