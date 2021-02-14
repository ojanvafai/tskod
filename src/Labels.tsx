import {defined} from './Base';
import {createLabel, fetchLabels} from './Gapi';

const TEAMAIL_BASE_LABEL = 'tm';
const MKTIME_BASE_LABEL = 'mktime';
const PRIORITY_LABEL_NAME = `${MKTIME_BASE_LABEL}/priority`;

export const LabelName = {
  keep: `${TEAMAIL_BASE_LABEL}/keep`,
  bookmark: `${PRIORITY_LABEL_NAME}/Bookmark`,
  pin: `${PRIORITY_LABEL_NAME}/Pin`,
  emptyDaily: `${PRIORITY_LABEL_NAME}/Empty-daily`,
  urgent: `${PRIORITY_LABEL_NAME}/Urgent`,
  backlog: `${PRIORITY_LABEL_NAME}/Backlog`,
  stuck: `${PRIORITY_LABEL_NAME}/Stuck`,
  softMute: `${MKTIME_BASE_LABEL}/softmute`,
};

export class Label {
  constructor(private _rawLabel: gapi.client.gmail.Label) {}

  getId(): string {
    return defined(this._rawLabel.id);
  }
}

export class LabelMap {
  private _nameToLabel: Map<string, Label>;
  private _idToLabel: Map<string, Label>;

  constructor() {
    this._nameToLabel = new Map();
    this._idToLabel = new Map();
  }

  async init(): Promise<void> {
    const rawLabels = await fetchLabels();
    if (!rawLabels.labels) {
      return;
    }
    for (const rawLabel of rawLabels.labels) {
      this._storeLabel(rawLabel);
    }
  }

  private _storeLabel(rawLabel: gapi.client.gmail.Label): void {
    const label = new Label(rawLabel);
    this._nameToLabel.set(defined(rawLabel.name), label);
    this._idToLabel.set(defined(rawLabel.id), label);
  }

  async getOrCreateLabel(labelName: string): Promise<Label> {
    const label = this._nameToLabel.get(labelName);
    if (label) {
      return label;
    }

    // TODO: There's a race here if the label got created in another client
    // after this client had initially loaded labels. This should realy return
    // in that case, but instead it throws an error due to receiving a 409 from
    // the createLabel call with status "ABORTED" and message "Label name exists
    // or conflicts"
    const parts = labelName.split('/');

    let labelSoFar;
    while (parts.length) {
      const part = parts.shift();
      labelSoFar = labelSoFar ? `${labelSoFar}/${part}` : part;
      if (this._nameToLabel.get(labelName)) {
        continue;
      }
      const labelData = {
        name: labelSoFar,
        labelListVisibility: 'labelHide',
        messageListVisibility: 'hide',
      };
      const rawLabel = await createLabel(labelData);
      this._storeLabel(rawLabel);
    }

    return defined(this._nameToLabel.get(labelName));
  }
}

const Labels = new LabelMap();
export {Labels};
