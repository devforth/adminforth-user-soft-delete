import { AdminForthPlugin, AdminForthDataTypes, AdminForthResourcePages, Filters} from "adminforth";
import type { IAdminForth, IHttpServer, AdminForthResourceColumn, AdminForthResource, IAdminForthHttpResponse, AdminUser, AdminForthComponentDeclaration } from "adminforth";
import type { PluginOptions } from './types.js';
    
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

    resourceConfig.columns.push({
      name: this.options.activeFieldName,
      label: 'Is Active',
      type: AdminForthDataTypes.BOOLEAN,
      showIn: {
        [AdminForthResourcePages.list]: true,
        [AdminForthResourcePages.edit]: true,
        [AdminForthResourcePages.create]: false,
        [AdminForthResourcePages.filter]: true,
        [AdminForthResourcePages.show]: true,
      },
      filterOptions: {
        multiselect: false,
      }
    });

    const beforeLoginConfirmation = this.adminforth.config.auth.beforeLoginConfirmation;
    const beforeLoginConfirmationArray = Array.isArray(beforeLoginConfirmation) ? beforeLoginConfirmation : [beforeLoginConfirmation];
    beforeLoginConfirmationArray.unshift(
      async({ extra, adminUser }: { adminUser: AdminUser, response: IAdminForthHttpResponse, extra?: any} )=> {
        const rejectResult = {
          body:{
            allowedLogin: false,
            redirectTo: '/login',
          },
          ok: true
        };
        if (adminUser.dbUser[this.options.activeFieldName] === false) {
          return rejectResult;
        }
      }
    );

    if ( !resourceConfig.options.pageInjections ) {
      resourceConfig.options.pageInjections = {};
    }
    if ( !resourceConfig.options.pageInjections.list ) {
      resourceConfig.options.pageInjections.list = {};
    }
    if ( !resourceConfig.options.pageInjections.list.threeDotsDropdownItems ) {
      resourceConfig.options.pageInjections.list.threeDotsDropdownItems = [];
    }
    (resourceConfig.options.pageInjections.list.threeDotsDropdownItems as AdminForthComponentDeclaration[]).push(
      { file: this.componentPath('DisableButton.vue'), meta: { pluginInstanceId: this.pluginInstanceId } }
    );

    // simply modify resourceConfig or adminforth.config. You can get access to plugin options via this.options;
  }
  
  validateConfigAfterDiscover(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    // optional method where you can safely check field types after database discovery was performed
  }

  instanceUniqueRepresentation(pluginOptions: any) : string {
    // optional method to return unique string representation of plugin instance. 
    // Needed if plugin can have multiple instances on one resource 
    return `user-soft-delete`;
  }

  setupEndpoints(server: IHttpServer) {
    server.endpoint({
      method: 'POST',
      path: `/plugin/${this.pluginInstanceId}/deactivateUser`,
      handler: async ({ adminUser,body }) => {
        let isAllowedToDeactivate = false;
        if ( typeof this.allowDisableFunc === "function" ) {
          isAllowedToDeactivate = await this.allowDisableFunc(adminUser);
        } else if (typeof this.allowDisableFunc === "boolean") {
          isAllowedToDeactivate = this.allowDisableFunc;
        }
        if ( isAllowedToDeactivate === false ) {
          return {ok: false, error: "Not allowed to deactivate user"}
        }
        const id = body.record;
        const primaryKeyColumn = this.resourceConfig.columns.find((col) => col.primaryKey);
        
        const oldUser = await this.adminforth
          .resource(this.resourceConfig.resourceId)
          .get([Filters.EQ(primaryKeyColumn.name, id)]);

        if (!oldUser) {
          throw new Error(`User with id ${id} not found`);
        }

        const newUser = { ...oldUser, [this.options.activeFieldName]: false };

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