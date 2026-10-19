import type { AdminUser, PluginsCommonOptions} from "adminforth";

export interface PluginOptions extends PluginsCommonOptions {
    activeFieldName: string; 
    /**
     * Who can deactivate users. When omitted, resource's `allowedActions.delete` is used.
     */
    canDeactivate?: boolean | ((adminUser: AdminUser) => boolean | Promise<boolean>);
}
