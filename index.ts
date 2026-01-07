import { AdminForthPlugin, AdminForthDataTypes, AdminForthResourcePages, Filters} from "adminforth";
import type { IAdminForth, IHttpServer, AdminForthResourceColumn, AdminForthResource, IAdminForthHttpResponse, AdminUser, AdminForthComponentDeclaration } from "adminforth";
import type { PluginOptions } from './types.js';
import { error } from "console";
    
export default class UserSoftDelete extends AdminForthPlugin {
  options: PluginOptions;
  allowDisableFunc: Function | null | boolean = null;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
  }

  async modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);
    if (this.options.canDeactivate) {
      this.allowDisableFunc = this.options.canDeactivate;
    } else if (resourceConfig.options.allowedActions.delete && typeof resourceConfig.options.allowedActions.delete === 'function') {
      this.allowDisableFunc = resourceConfig.options.allowedActions.delete;
    } else if (resourceConfig.options.allowedActions.delete && typeof resourceConfig.options.allowedActions.delete === 'boolean') {
      this.allowDisableFunc = async () => resourceConfig.options.allowedActions.delete;
    } else {
      this.allowDisableFunc = async () => true;
    }
    
    resourceConfig.options.allowedActions.delete = false;

    const beforeLoginConfirmation = this.adminforth.config.auth.beforeLoginConfirmation;
    const beforeLoginConfirmationArray = Array.isArray(beforeLoginConfirmation) ? beforeLoginConfirmation : [beforeLoginConfirmation];
    beforeLoginConfirmationArray.unshift(
      async({ extra, adminUser }: { adminUser: AdminUser, response: IAdminForthHttpResponse, extra?: any} )=> {
        const rejectResult = {
          error: 'Your account is deactivated',
          body:{
            allowedLogin: false,
            redirectTo: '/login',
          }
        };
        if (adminUser.dbUser[this.options.activeFieldName] === false) {
          return rejectResult;
        }
        return { body: {allowedLogin: true} };
      }
    );

    const adminUserAuthorize = this.adminforth.config.auth.adminUserAuthorize;
    const adminUserAuthorizeArray = Array.isArray(adminUserAuthorize) ? adminUserAuthorize : [adminUserAuthorize];
    adminUserAuthorizeArray.unshift(
      async({ extra, adminUser }: { adminUser: AdminUser, response: IAdminForthHttpResponse, extra?: any} )=> {
        const rejectResult = {
          error: 'Your account is deactivated',
          allowed: false,
        };
        if (adminUser.dbUser[this.options.activeFieldName] === false) {
          return rejectResult;
        }
        return { allowed: true };
      }
    );
    
    this.adminforth.config.auth.beforeLoginConfirmation = beforeLoginConfirmationArray;

    if ( !resourceConfig.options.pageInjections ) {
      resourceConfig.options.pageInjections = {};
    }
    if ( !resourceConfig.options.pageInjections.list ) {
      resourceConfig.options.pageInjections.list = {};
    }
    if ( !resourceConfig.options.pageInjections.list.customActionIcons ) {
      resourceConfig.options.pageInjections.list.customActionIcons = [];
    }
    (resourceConfig.options.pageInjections.list.customActionIcons as AdminForthComponentDeclaration[]).push(
      { file: this.componentPath('DisableButton.vue'), meta: { pluginInstanceId: this.pluginInstanceId, field: this.options.activeFieldName } }
    );

    if ( !resourceConfig.options.pageInjections.list.afterBreadcrumbs ) {
      resourceConfig.options.pageInjections.list.afterBreadcrumbs = [];
    }
    (resourceConfig.options.pageInjections.list.afterBreadcrumbs as AdminForthComponentDeclaration[]).push(
      { file: this.componentPath('UserSoftDeleteFilterSetter.vue'), meta: { pluginInstanceId: this.pluginInstanceId, field: this.options.activeFieldName } }
    );

    // simply modify resourceConfig or adminforth.config. You can get access to plugin options via this.options;
  }
  
  validateConfigAfterDiscover(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    // optional method where you can safely check field types after database discovery was performed
    if (!this.options.activeFieldName) {
      throw new Error(`Option activeFieldName is required for UserSoftDelete plugin on resource ${this.resourceConfig.resourceId}`);
    }
    const column = this.resourceConfig.columns.find(f => f.name === this.options.activeFieldName);
    if (!column) {
      throw new Error(`Field ${this.options.activeFieldName} not found in resource ${this.resourceConfig.resourceId}`);
    }
    if (![AdminForthDataTypes.BOOLEAN].includes(column!.type!)) {
      throw new Error(`Field ${this.options.activeFieldName} should be boolean, but it is ${column!.type}`);
    }
  }

  instanceUniqueRepresentation(pluginOptions: any) : string {
    // optional method to return unique string representation of plugin instance. 
    // Needed if plugin can have multiple instances on one resource 
    return `single`;
  }

  setupEndpoints(server: IHttpServer) {
    server.endpoint({
      method: 'POST',
      path: `/plugin/${this.pluginInstanceId}/deactivateUser`,
      handler: async ({ adminUser,body }) => {
        let isAllowedToDeactivate = false;
        if ( typeof this.allowDisableFunc === "function" ) {
          isAllowedToDeactivate = await this.allowDisableFunc(adminUser);
        }
        if ( isAllowedToDeactivate === false ) {
          return {ok: false, error: "Not allowed to deactivate user"}
        }

        const primaryKeyColumn = this.resourceConfig.columns.find((col) => col.primaryKey);
        const id = body.record[primaryKeyColumn.name];
        
        const oldUser = await this.adminforth
          .resource(this.resourceConfig.resourceId)
          .get([Filters.EQ(primaryKeyColumn.name, id)]);

        if (!oldUser) {
          throw new Error(`User with id ${id} not found`);
        }

        if (oldUser[this.options.activeFieldName] === false) {
          return {ok: false, error: "User is already deactivated"}
        }
        
        if (oldUser[primaryKeyColumn.name] === adminUser.dbUser[primaryKeyColumn.name]) {
          return {ok: false, error: "You cannot deactivate your own account"}
        }

        const newUser = { [this.options.activeFieldName]: false };
        
        await this.adminforth.updateResourceRecord({
          resource: this.resourceConfig,
          recordId: id,
          oldRecord: oldUser,
          record: newUser,
          adminUser: adminUser
        })
        return {ok: true}
      }
    });
  }

}