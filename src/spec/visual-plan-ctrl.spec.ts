import { YouTrackIssue } from '@fschopp/project-planning-for-you-track';
import { YouTrackMetadata } from '@fschopp/project-planning-ui-for-you-track';
import { EnumBundleCustomFieldDefaults } from '@fschopp/project-planning-ui-for-you-track/dist/es6/youtrack-rest';
// Since some (transpiled) dependencies define async functions, we need the Babel polyfill.
// See also: https://github.com/babel/babel/issues/5085
import 'regenerator-runtime';
import S from 's-js';
import { GraphvizAppCtrl } from '../main/graphviz-app-ctrl';
import {
  createGraphvizApp,
  createGraphvizAppComputation,
  GraphvizApp,
  GraphvizAppComputation,
} from '../main/graphviz-app-model';


test('generates visualization if GraphvizAppComputation.projectPlan signal changes', () => {
  const app: GraphvizApp = createGraphvizApp();
  const appComputation: GraphvizAppComputation = createGraphvizAppComputation();

  app.settings.youTrackBaseUrl('http://fake-youtrack/');
  let appCtrl: GraphvizAppCtrl | undefined;
  S.root(() => {
    appCtrl = GraphvizAppCtrl.createDefaultGraphvizCtrl(app, appComputation);
  });
  if (appCtrl === undefined) {
    throw new Error('appCtrl should be defined');
  }

  expect(appComputation.dot()).toEqual(undefined);

  appComputation.youTrackMetadata(mockYouTrackMetadata);
  // TODO: The following does not yet work, because there is no Worker in the node.js test environment.
  /*
  appComputation.projectPlan({
    issues: youTrackIssues(mockIssues),
    warnings: [],
  });
  */

  const dot: string | undefined = appComputation.dot();
  console.log(dot);
});

interface Issue {
  idx: number;
  resolved?: boolean;
  assignee?: number;
  parent?: number;
  type?: number;
  deps?: number[];
}

const mockIssues: Issue[] = [
  {idx: 1, assignee: 0, type: 0},
  {idx: 2, assignee: 0, parent: 1, type: 1},
  {idx: 3, assignee: 0, parent: 1, type: 0, deps: [2]},
  {idx: 4, assignee: 0, parent: 3},
  {idx: 5, assignee: 0, type: 2},
  {idx: 6, resolved: true, assignee: 0, parent: 5, type: 1},
  {idx: 7, assignee: 0, parent: 5, type: 3},
  {idx: 8, assignee: 0, type: 1, deps: [5]},
];

const mockYouTrackMetadata: YouTrackMetadata = {
  baseUrl: 'http://fake-youtrack/',
  customFields: [{
    $type: 'FieldType',
    id: 'type-field-id',
    fieldDefaults: {
      $type: 'EnumBundleCustomFieldDefaults',
      bundle: {
        $type: 'EnumBundle',
        values: [{
          $type: 'EnumBundleElement',
          color: {
            $type: 'FieldStyle',
            background: '#111',
            foreground: '#111111',
          },
          id: 'type-1',
          name: 'Type 1',
          ordinal: 1,
        }],
      },
    } as EnumBundleCustomFieldDefaults,
    fieldType: {
      $type: 'FieldType',
      id: 'enum[1]',
    },
    name: 'Type',
  }],
  issueLinkTypes: [],
  savedSearches: [],
  users: [{
    $type: 'User',
    avatarUrl: '',
    fullName: 'User 0',
    id: 'user-0',
  }],
  minutesPerWorkWeek: 5 * 8 * 60,
};

function youTrackIssues(issues: Issue[]): YouTrackIssue[] {
  return issues.map((issue) => ({
    id: `XYZ-${issue.idx}`,
    summary: `Issue ${issue.idx}`,
    issueActivities: [],
    resolved: issue.resolved
        ? 1
        : Number.MAX_SAFE_INTEGER,
    state: '',
    assignee: `user-${issue.assignee}`,
    parent: issue.parent === undefined
        ? ''
        : `XYZ-${issue.parent}`,
    customFields: issue.type === undefined
        ? {} as {}
        : {
            'type-field-id': `type-${issue.type}`,
          },
    remainingEffortMs: 0,
    remainingWaitTimeMs: 0,
    splittable: false,
    dependencies: (issue.deps === undefined ? [] : issue.deps).map((dep) => `XYZ-${dep}`),
  }));
}
