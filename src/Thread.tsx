import {defined} from './Base';
import {fetchMessageIdsAndLabels, fetchMessagesByIds} from './Gapi';
import {Message} from './Message';

export class Thread {
  private _rawThread: gapi.client.gmail.Thread;
  private _messages: Message[] | undefined;
  private _firstAndLastMessages: Message[] | undefined;

  constructor(thread: gapi.client.gmail.Thread) {
    this._rawThread = thread;
    this._messages = undefined;
    this._firstAndLastMessages = undefined;
  }

  get id(): string {
    return defined(this._rawThread.id);
  }

  get messages(): Message[] {
    return defined(this._messages);
  }

  get firstAndLastMessages(): Message[] | undefined {
    return this._firstAndLastMessages;
  }

  hasMessagesInInbox(): boolean {
    for (const message of defined(this.messages)) {
      if (message.labelIds.includes('INBOX')) {
        return true;
      }
    }
    return false;
  }

  async fetchMessages(): Promise<void> {
    this._rawThread = defined(await fetchMessageIdsAndLabels(this.id));
    const messages = defined(this._rawThread.messages).map(
      (x) => new Message(x),
    );
    this._messages = messages;

    const messageIdsToFetch = [defined(messages[0].id)];
    if (messages.length > 1) {
      messageIdsToFetch.push(defined(messages[messages.length - 1].id));
    }

    const rawFirstAndLastMessages = await fetchMessagesByIds(messageIdsToFetch);

    this._firstAndLastMessages = rawFirstAndLastMessages.map(
      (x) => new Message(x),
    );
  }
}
