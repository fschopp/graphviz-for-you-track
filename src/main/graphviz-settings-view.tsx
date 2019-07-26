import {
  AssigneeFieldView, Counter,
  DependsLinkTypeView,
  IssueTypeFieldView,
  SavedQueryView,
  SettingsView,
} from '@fschopp/project-planning-ui-for-you-track';
import { DataSignal } from 's-js';
import * as Surplus from 'surplus'; // lgtm [js/unused-local-variable]
import { GraphvizSettingsCtrl } from './graphviz-settings-ctrl';
import { GraphvizSettings } from './graphviz-settings-model';

export function GraphvizSettingsView(
    {settings, ctrl, connectSignal, invalidCounter}:
      {
        readonly settings: GraphvizSettings;
        readonly ctrl: GraphvizSettingsCtrl;
        readonly connectSignal: DataSignal<null>;
        readonly invalidCounter: Counter;
      }
    ): HTMLElement {
  return (
      <div>
        <SettingsView settings={settings} ctrl={ctrl.settingsCtrl} connectSignal={connectSignal}
                      invalidCounter={invalidCounter} />
        <hr />
        <AssigneeFieldView elementId={settings.assigneeFieldId} elements={ctrl.userFields} />
        <IssueTypeFieldView elementId={settings.typeFieldId} elements={ctrl.enumFields}/>
        <DependsLinkTypeView dependsLinkType={settings}
                             directedIssueLinkTypes={ctrl.youTrackMetadataCtrl.directedIssueLinkTypes}
                             invalidCounter={invalidCounter} />
        <SavedQueryView id="savedQuery" label="Saved Query:" elementId={settings.savedQueryId}
                        elements={ctrl.youTrackMetadataCtrl.savedQueries} invalidCounter={invalidCounter}>
          The saved search containing the issues that will comprise the visual plan. Issues will be processed by
          the <a href="https://www.graphviz.org" target="_blank">Graphviz</a> layout engine in the order of this saved
          search.
        </SavedQueryView>
      </div>
  );
}
