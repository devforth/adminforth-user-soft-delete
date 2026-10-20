import { AdminForthPlugin, AdminForthDataTypes, AdminForthResourcePages, Filters, ActionCheckSource } from "adminforth";
import type { IAdminForth, IHttpServer, AdminForthResourceColumn, AdminForthResource, AdminUser, AdminForthComponentDeclaration, AllowedActionValue } from "adminforth";
import type { PluginOptions } from './types.js';
import { error } from "console";
import { z } from "zod";

const deactivateUserBodySchema = z.object({
  record: z.record(z.string(), z.unknown()),
}).strict();

export default class UserSoftDelete extends AdminForthPlugin {
  options: PluginOptions;
  deleteAllowed: AllowedActionValue;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
  }

  async modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);
    // remember original delete permission before hiding the standard delete button
    this.deleteAllowed = resourceConfig.options.allowedActions.delete;
    resourceConfig.options.allowedActions.delete = false;

    const beforeLoginConfirmation = this.adminforth.config.auth.beforeLoginConfirmation;
    const beforeLoginConfirmationArray = Array.isArray(beforeLoginConfirmation) ? beforeLoginConfirmation : [beforeLoginConfirmation];
    beforeLoginConfirmationArray.unshift(
      async({ extra, adminUser }: { adminUser: AdminUser, extra?: any} )=> {
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
      async({ extra, adminUser }: { adminUser: AdminUser, extra?: any} )=> {
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

  async isAllowedToDeactivate(adminUser: AdminUser): Promise<boolean> {
    const { canDeactivate } = this.options;
    if (canDeactivate !== undefined) {
      return typeof canDeactivate === 'function' ? canDeactivate(adminUser) : canDeactivate;
    }
    if (typeof this.deleteAllowed === 'function') {
      const allowed = await this.deleteAllowed({
        adminUser,
        resource: this.resourceConfig,
        meta: {},
        source: ActionCheckSource.DeleteRequest,
        adminforth: this.adminforth,
      });
      return allowed === true;
    }
    return this.deleteAllowed;
  }

  setupEndpoints(server: IHttpServer) {
    server.endpoint({
      method: 'POST',
      path: `/plugin/${this.pluginInstanceId}/deactivateUser`,
      request_schema: deactivateUserBodySchema,
      handler: async ({ adminUser, body, response }) => {
        console.log(`UserSoftDelete: deactivateUser endpoint called by ${adminUser.dbUser[this.resourceConfig.columns.find((col) => col.primaryKey).name]}`);
        const data = body as z.infer<typeof deactivateUserBodySchema>;
        if (!await this.isAllowedToDeactivate(adminUser)) {
          return {ok: false, error: "Not allowed to deactivate user"}
        }

        const primaryKeyColumn = this.resourceConfig.columns.find((col) => col.primaryKey);
        if (!data.record) {
          return { ok: false, error: "No record provided" };
        }
        const id = data.record[primaryKeyColumn.name];
        if (id === undefined || id === null) {
          return { ok: false, error: "No record id provided" };
        }
        
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
          updates: newUser,
          adminUser: adminUser
        })
        return {ok: true}
      }
    });
  }

}