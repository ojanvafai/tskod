import {defined} from './Base';
import {decode} from './Base64Url';

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
  _html?: string;
  _plain?: string;

  constructor(message: gapi.client.gmail.Message) {
    this._rawMessage = message;
    // TODO: Do all parsing lazily.
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

  _parseBody(): void {
    this._parseMessagePart(this._rawMessage.payload);
  }

  getHtmlOrPlain(): string {
    this._parseBody();
    return this._html || this._plain || '';
  }

  _parseMessagePart(payload?: gapi.client.gmail.MessagePart): void {
    if (!payload) {
      return;
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        this._parseMessagePart(part);
      }
      return;
    }

    const data = payload.body?.data;
    if (!data) {
      return;
    }

    const decoded = decode(data);
    console.log(data, decoded);
    const mimeType = payload.mimeType;

    // TODO: There's probably more mime types we need to handle.
    // TODO: Need to url base64 decode this
    switch (mimeType) {
      case 'text/plain':
        this._plain = decoded;
        break;
      case 'text/html':
        this._html = decoded;
        break;
    }
  }
}
