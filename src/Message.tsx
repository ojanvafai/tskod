import {defined} from './Base';

export class Message {
  private _rawMessage: gapi.client.gmail.Message;
  subject?: string;

  constructor(message: gapi.client.gmail.Message) {
    this._rawMessage = message;
    this._parseHeaders();
  }

  get id(): string {
    return defined(this._rawMessage.id);
  }

  private _parseHeaders(): void {
    const headers = defined(this._rawMessage.payload?.headers);
    for (const header of headers) {
      const name = defined(header.name).toLowerCase();
      switch (name) {
        case 'subject':
          this.subject = defined(header.value);
      }
    }
  }
}
