import React, { useEffect, useReducer, useState } from 'react';
import { Button, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { fetchThreads, modifyThread, login } from '../Gapi';
import { Thread } from '../Thread';
import { LabelName, Labels } from '../Labels';

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
  function reducer(state: ThreadsState, action: UpdateThreadListAction): ThreadsState {
    if (action.removeThreadId) {
      return {
        threads: state.threads.filter((x) => x.id() !== action.removeThreadId),
      };
    }
    if (action.threads) {
      return { threads: action.threads };
    }
    throw new Error('Invalid thread reducer action.');
  }

  const [threadListState, updateThreadListState] = useReducer(reducer, {
    threads: [],
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

        updateThreadListState({ threads });
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

  // TODO: Once we take message fetching out of Card creation, only prerender
  // one card below the most recently swiped card. Until then, render more cards
  // and prevent rendering their messages to avoid getting stalled on slow
  // network.
  const numCardsRendered = 10;

  function hashCode(str: string): number {
    let hash = 0,
      i,
      chr;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      hash = (hash << 5) - hash + chr;
      // eslint-disable-next-line no-bitwise
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  function LCG(a: number): number {
    // eslint-disable-next-line no-bitwise
    a = Math.imul(48271, a) | 0 % 2147483647;
    // eslint-disable-next-line no-bitwise
    return (a & 2147483647) / 2147483648;
  }

  const cards = threadListState.threads.slice(0, numCardsRendered).map((thread, index) => {
    const threadId = thread.id();
    const rand = LCG(hashCode(threadId));
    const xOffset = 8 * rand - 0.5;
    const angleOffset = 2 * rand - 0.5;
    return (
      <Card
        key={threadId}
        thread={thread}
        onCardOffScreen={updateThreadListState}
        preventRenderMessages={index > 2}
        xOffset={xOffset}
        angleOffset={angleOffset}
      />
    );
  });

  // First card is at the bottom of the visual stack and last card is at the
  // top. So reverse so we can have the first thread show up visibly at the top
  // of the stack.
  cards.reverse();

  const noCardsStyleOrEmpty = StyleSheet.create({
    view: cards.length ? {} : { justifyContent: 'center', alignItems: 'center' },
  });

  const style = StyleSheet.create({
    view: { flex: 1, backgroundColor: '#eee' },
  });

  return (
    <React.Fragment>
      <StatusBar barStyle='dark-content' />
      <SafeAreaView style={style.view}>
        {/* Wrapper View prevents absolutely positioned Cards from escaping the safe area. */}
        <View style={[style.view, noCardsStyleOrEmpty.view]}>
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
