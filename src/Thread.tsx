import { defined } from './Base';
import { fetchMessageIdsAndLabels, fetchMessagesByIds } from './Gapi';
import { Message } from './Message';

export class Thread {
  private _rawThread: gapi.client.gmail.Thread;
  private _messages: Message[] | undefined;
  private _firstAndLastMessages: Message[] | undefined;

  constructor(thread: gapi.client.gmail.Thread) {
    this._rawThread = thread;
    this._messages = undefined;
    this._firstAndLastMessages = undefined;
  }

  id(): string {
    return defined(this._rawThread.id);
  }

  messages(): Message[] {
    return defined(this._messages);
  }

  firstAndLastMessages(): Message[] | undefined {
    return this._firstAndLastMessages;
  }

  hasMessagesInInbox(): boolean {
    return this.messages()?.some((x) => x.labelIds().includes('INBOX'));
  }

  async fetchMessages(): Promise<void> {
    this._rawThread = await fetchMessageIdsAndLabels(this.id());
    const messages = this._rawThread.messages?.map((x) => new Message(x));
    this._messages = messages;

    const messageIdsToFetch: string[] = [];
    if (messages?.length) {
      messageIdsToFetch.push(messages?.[0]?.id());
      if (messages.length > 1) {
        messageIdsToFetch.push(messages?.[messages.length - 1].id());
      }
    }

    const rawFirstAndLastMessages = await fetchMessagesByIds(messageIdsToFetch);

    this._firstAndLastMessages = rawFirstAndLastMessages.map((x) => new Message(x));
  }
}
