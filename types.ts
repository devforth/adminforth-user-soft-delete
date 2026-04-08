import type { AdminUser, PluginsCommonOptions} from "adminforth";

export interface PluginOptions extends PluginsCommonOptions {
    activeFieldName: string; 
    canDeactivate: (adminUser: AdminUser) => Promise<boolean>;
}
