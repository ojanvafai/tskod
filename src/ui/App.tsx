import React, { useEffect, useReducer, useState } from 'react';
import { Button, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { fetchThreads, modifyThread, login } from '../Gapi';
import { Thread } from '../Thread';
import { LabelName, Labels } from '../Labels';

interface CardPosition {
  rotation: number;
  offset: number;
}

interface ThreadsState {
  threads: Thread[];
  cardPositions: Map<string, CardPosition>;
}

export interface UpdateThreadListAction {
  removeThreadId?: string;
  thread?: Thread;
}

enum LoadState {
  initial,
  loading,
  loaded,
}

// TODO: Add setaside
enum PriorityVisibility {
  visible,
  hidden,
}

enum BuiltInAction {
  archive,
  moveToPriority,
}

// If the action value is a string, it's the name of the priority to move to.
type Action = BuiltInAction | string;

enum TriggerType {
  deadline,
  newMessage,
}

interface DeadlineTrigger {
  type: TriggerType.deadline;
  action: Action;
  allowCustomDeadlines: boolean;
  deadline?: number;
}

interface NewMessageTrigger {
  type: TriggerType.newMessage;
  action: Action;
}

interface PriorityConfig {
  name: string;
  visibility: PriorityVisibility;
  triggers?: (DeadlineTrigger | NewMessageTrigger)[];
}

// OJAN: Prefix all the priority names with tm/ or mk/ as appropriate.
const priorityConfigList: PriorityConfig[] = [
  {
    name: 'Mute',
    visibility: PriorityVisibility.hidden,
    triggers: [{ type: TriggerType.newMessage, action: BuiltInAction.archive }],
  },
  {
    name: 'SoftMute/%epoch%',
    visibility: PriorityVisibility.hidden,
    triggers: [
      // OJAN: This needs to maintain the epoch number
      { type: TriggerType.newMessage, action: 'SoftMuteNewMessages/%epoch%' },
      { type: TriggerType.deadline, action: BuiltInAction.archive, allowCustomDeadlines: true },
    ],
  },
  {
    name: 'Stuck',
    visibility: PriorityVisibility.visible,
  },
  {
    name: 'Stuck/%epoch%',
    visibility: PriorityVisibility.hidden,
    triggers: [
      { type: TriggerType.newMessage, action: 'Stuck' },
      { type: TriggerType.deadline, action: 'Stuck', allowCustomDeadlines: true },
    ],
  },
  {
    name: 'mk/priority/Empty-Daily',
    visibility: PriorityVisibility.hidden,
    triggers: [
      // OJAN: This isn't quite right since we want to pick a random sample to mark for retriage
      { type: TriggerType.deadline, action: 'Retriage', deadline: 2, allowCustomDeadlines: false },
    ],
  },
  {
    name: 'mk/priority/Urgent',
    visibility: PriorityVisibility.hidden,
    triggers: [
      // OJAN: This isn't quite right since we want to pick a random sample to mark for retriage
      { type: TriggerType.deadline, action: 'Retriage', deadline: 7, allowCustomDeadlines: false },
    ],
  },
  {
    name: 'mk/priority/Backlog',
    visibility: PriorityVisibility.hidden,
    triggers: [
      // OJAN: This isn't quite right since we want to pick a random sample to mark for retriage
      { type: TriggerType.deadline, action: 'Retriage', deadline: 28, allowCustomDeadlines: false },
    ],
  },
];

// Not covered here:
// bookmark
// triage later
// archive-if-no-new-messages, next-lower-priority, and next-higher-priority actions as ergonomic sugar.

console.log(priorityConfigList);


function App(): JSX.Element {
  // TODO: Once we take message fetching out of Card creation, only prerender
  // one card below the most recently swiped card. Until then, render more cards
  // and prevent rendering their messages to avoid getting stalled on slow
  // network.

  const updateCardPositionsForThreads = function (
    cardPositions: Map<string, CardPosition>,
    threads: Thread[],
  ): Map<string, CardPosition> {
    const newCardPositions = new Map<string, CardPosition>();
    for (const thread of threads) {
      let position = cardPositions.get(thread.id());
      if (!position) {
        position = {
          rotation: 2 * (Math.random() - 0.5),
          offset: 8 * (Math.random() - 0.5),
        };
      }
      newCardPositions.set(thread.id(), position);
    }
    return newCardPositions;
  };

  function reducer(state: ThreadsState, action: UpdateThreadListAction): ThreadsState {
    const result: ThreadsState = { threads: [], cardPositions: new Map<string, CardPosition>() };
    if (action.removeThreadId) {
      result.threads = state.threads.filter((x) => x.id() !== action.removeThreadId);
    } else if (action.thread) {
      result.threads = [...state.threads, action.thread];
    } else {
      throw new Error('Invalid thread reducer action.');
    }
    result.cardPositions = updateCardPositionsForThreads(state.cardPositions, result.threads);
    return result;
  }

  const [threadListState, updateThreadListState] = useReducer(reducer, {
    threads: [],
    cardPositions: new Map<string, CardPosition>(),
  });

  const [loadingThreads, setLoadingThreads] = useState(LoadState.initial);

  useEffect(() => {
    async function* fetchThreadsWithMetadata(): AsyncGenerator<Thread> {
      // TODO: Sort by date.

      const namesToExclude = Object.values(LabelName).join('" -in:"');
      const query = `in:inbox -in:chats -in:"${namesToExclude}"`;

      const threads = (await fetchThreads(query)).threads;

      if (!threads) {
        return;
      }

      for (const rawThread of threads) {
        const thread = new Thread(rawThread);
        await thread.fetchMessages();
        if (!thread.hasMessagesInInbox()) {
          await modifyThread(thread.id(), [], ['INBOX']);
          continue;
        }

        yield thread;
      }
    }
    if (loadingThreads !== LoadState.loading) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      // TODO - convert to `for await`. See https://github.com/facebook/react-native/issues/27432
      const threadGenerator = fetchThreadsWithMetadata();
      while (true) {
        const generatorResult = await threadGenerator.next();
        if (generatorResult.done) {
          break;
        }
        const thread = generatorResult.value;
        updateThreadListState({ thread });
      }
      setLoadingThreads(LoadState.loaded);
    })();
  }, [loadingThreads]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      await login();
      await Labels.init();
      setLoadingThreads(LoadState.loading);
    })();
  }, []);

  const numCardsRendered = 10;
  const renderedThreads = threadListState.threads.slice(0, numCardsRendered);

  const cards = renderedThreads.map((thread, index) => {
    const threadId = thread.id();
    let { rotation, offset } = threadListState.cardPositions.get(thread.id()) ?? {
      rotation: 0,
      offset: 0,
    };
    if (index < 2) {
      rotation = 0;
      offset = 0;
    }
    return (
      <Card
        key={threadId}
        thread={thread}
        onCardOffScreen={updateThreadListState}
        preventRenderMessages={index > 2}
        xOffset={offset}
        angleOffset={rotation}
      />
    );
  });

  // First card is at the bottom of the visual stack and last card is at the
  // top. So reverse so we can have the first thread show up visibly at the top
  // of the stack.
  cards.reverse();

  const style = StyleSheet.create({
    view: { flex: 1, backgroundColor: '#eee' },
    viewWithoutCards: cards.length ? {} : { justifyContent: 'center', alignItems: 'center' },
  });

  return (
    <React.Fragment>
      <StatusBar barStyle='dark-content' />
      <SafeAreaView style={style.view}>
        {/* Wrapper View prevents absolutely positioned Cards from escaping the safe area. */}
        <View style={[style.view, style.viewWithoutCards]}>
          {cards.length ? (
            cards
          ) : (
            <Text>
              {loadingThreads !== LoadState.loaded ? (
                'Loading...'
              ) : (
                <Button
                  title='Check for new messages'
                  onPress={(): void => setLoadingThreads(LoadState.loading)}
                />
              )}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </React.Fragment>
  );
}

export default App;
