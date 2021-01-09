import {defined} from './Base';

export class Message {
  private _rawMessage: gapi.client.gmail.Message;
  subject?: string;
  from?: string;
  to?: string;
  cc?: string;
  date?: string;
  deliveredTo?: string;
  replyTo?: string;
  sender?: string;
  messageId?: string;

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
          break;

        case 'from':
          this.from = defined(header.value);
          break;

        case 'to':
          this.to = defined(header.value);
          break;

        case 'cc':
          this.cc = defined(header.value);
          break;

        case 'date':
          this.date = defined(header.value);
          break;

        case 'delivered-to':
          this.deliveredTo = defined(header.value);
          break;

        case 'reply-to':
          this.replyTo = defined(header.value);
          break;

        case 'sender':
          this.sender = defined(header.value);
          break;

        case 'message-id':
          this.messageId = defined(header.value);
          break;
      }
    }
    // Some messages don't have a date header. Fallback to gmail's internal one.
    if (!this.date) {
      this.date = this._rawMessage.internalDate;
    }
  }
}
