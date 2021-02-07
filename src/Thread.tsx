import {defined} from './Base';
import {fetchMessageIdsAndLabels, fetchMessagesByIds} from './Gapi';
import {Message} from './Message';

export class Thread {
  private _rawThread: gapi.client.gmail.Thread;
  private _messages: Message[];

  constructor(thread: gapi.client.gmail.Thread) {
    this._rawThread = thread;
    this._messages = [];
  }

  get id(): string {
    console.log('GETTING ID');
    const id = defined(this._rawThread.id);
    console.log('GOT ID');
    return id;
  }

  get messages(): Message[] {
    return this._messages;
  }

  async fetchMessages(): Promise<void> {
    const messageIds = defined(
      (await fetchMessageIdsAndLabels(this.id)).messages,
    );

    /*if (messages.length > 1) {
          let hasMessageInInbox = false;
          for (const messageId of messageIds) {
            if (messageId.labelIds?.includes('INBOX')) {
              hasMessageInInbox = true;
              break;
            }
          }
          if (!hasMessageInInbox) {
            await modifyThread(props.threadId, [], ['INBOX']);
            onCardOffScreen({removeThreadId: props.threadId});
          }*/
    //messageIdsToFetch.push(defined(messageIds[messageIds.length - 1].id));
    //}
    //const messageContentsData = await fetchMessagesByIds(messageIdsToFetch);

    const rawMessages = await fetchMessagesByIds(
      messageIds.map((x) => defined(x.id)),
    );
    this._messages = rawMessages.map((x) => new Message(x));
  }
}
