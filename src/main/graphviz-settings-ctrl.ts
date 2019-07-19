import { SettingsCtrl, YouTrackMetadataCtrl, YouTrackRest, } from '@fschopp/project-planning-ui-for-you-track';

/**
 * Controller for settings related to the visual project plan.
 */
export class GraphvizSettingsCtrl {
  public readonly enumFields: () => Map<string, YouTrackRest.CustomField>;
  public readonly userFields: () => Map<string, YouTrackRest.CustomField>;

  public constructor(
      public readonly settingsCtrl: SettingsCtrl,
      public readonly youTrackMetadataCtrl: YouTrackMetadataCtrl
  ) {
    this.enumFields = youTrackMetadataCtrl.mapOfCustomFieldTypes('enum[1]');
    this.userFields = youTrackMetadataCtrl.mapOfCustomFieldTypes('user[1]');
  }
}
