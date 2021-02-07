import React, {useEffect, useReducer, useState} from 'react';
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Card} from './Card';
import {archiveMessages, fetchThreads, modifyMessages, login} from '../Gapi';
import {Message} from '../Message';
import {Thread} from '../Thread';
import {defined} from '../Base';
import {LabelName, Labels} from '../Labels';

export interface ThreadActions {
  archive: (messages: Message[]) => Promise<void>;
  keep: (messages: Message[]) => Promise<void>;
}

interface ThreadsState {
  threads: Thread[];
}

export interface UpdateThreadListAction {
  removeThreadId?: string;
  threads?: Thread[];
}

enum LoadState {
  initial,
  loading,
  loaded,
}

function App(): JSX.Element {
  function reducer(
    state: ThreadsState,
    action: UpdateThreadListAction,
  ): ThreadsState {
    if (action.removeThreadId) {
      return {
        threads: state.threads.filter((x) => x.id !== action.removeThreadId),
      };
    }
    if (action.threads) {
      return {threads: action.threads};
    }
    throw new Error('Invalid thread reducer action.');
  }

  const [threadListState, updateThreadListState] = useReducer(reducer, {
    threads: [],
  });

  const [loadingThreads, setLoadingThreads] = useState(LoadState.initial);

  async function* fetchThreadsWithMetadata(): AsyncGenerator<Thread> {
    // TODO: Sort by date.
    const threads = (await fetchThreads(`in:inbox -in:${LabelName.keep}`))
      .threads;

    console.log(threads);

    if (!threads) {
      console.log('Likely auth issue.');
      return;
    }

    for (const rawThread of threads) {
      const thread = new Thread(rawThread);
      await thread.fetchMessages();
      yield thread;
      console.log('Yielded a thread with messages ' + thread.messages);
    }
  }

  useEffect(() => {
    console.log('USEEFFECT');
    if (loadingThreads !== LoadState.loading) {
      console.log('NOT LOADING');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      console.log('ABOUT TO FETCH THREADS');
      const threads: Thread[] = [];
      // TODO - convert to `for await`. See https://github.com/facebook/react-native/issues/27432
      const threadGenerator = fetchThreadsWithMetadata();
      while (true) {
        const generatorResult = await threadGenerator.next();
        if (generatorResult.done) {
          break;
        }
        const thread = generatorResult.value;

        threads.push(thread);
        console.log('UPDATING STATE TO ');
        updateThreadListState({threads});
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

  const threadActions: ThreadActions = {
    archive: (messages: Message[]) => {
      return archiveMessages(messages);
    },
    keep: async (messages: Message[]) => {
      const keepLabel = await Labels.getOrCreateLabel(LabelName.keep);
      return modifyMessages(messages, [keepLabel.getId()], []);
    },
  };

  // TODO: Once we take message fetching out of Card creation, only prerender
  // one card below the most recently swiped card. Until then, render more cards
  // and prevent rendering their messages to avoid getting stalled on slow
  // network.
  const numCardsRendered = 10;

  console.log('THREADS ARE');
  console.log(threadListState.threads);

  const cards = threadListState.threads
    .slice(0, numCardsRendered)
    .map((thread, index) => {
      const threadId = thread.id;
      return (
        <Card
          key={threadId}
          thread={thread}
          actions={threadActions}
          onCardOffScreen={updateThreadListState}
          preventRenderMessages={index > 2}
        />
      );
    });

  console.log('LENGTH OF CARDS IS ' + cards.length);

  // First card is at the bottom of the visual stack and last card is at the
  // top. So reverse so we can have the first thread show up visibly at the top
  // of the stack.
  cards.reverse();

  const style = StyleSheet.create({
    view: cards.length
      ? {flex: 1}
      : {flex: 1, justifyContent: 'center', alignItems: 'center'},
  });

  return (
    <React.Fragment>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={style.view}>
        <Text>{cards.length}</Text>
        {/* Wrapper View prevents absolutely positioned Cards from escaping the safe area. */}
        <View style={style.view}>
          {cards.length ? (
            cards
          ) : (
            <Text>
              {loadingThreads !== LoadState.loaded ? (
                'Loading...' + cards.length
              ) : (
                <Button
                  title="Check for new messages"
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
