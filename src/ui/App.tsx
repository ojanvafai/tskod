import React, {useEffect, useReducer, useState} from 'react';
import {Button, SafeAreaView, StyleSheet, Text, View} from 'react-native';

import {GoogleSignin, statusCodes} from '@react-native-community/google-signin';

import {Card} from './Card';
import {
  archiveMessages,
  fetchThreads,
  applyLabelToMessages,
  saveAccessToken,
} from '../Gapi';
import {Message} from '../Message';
import {defined} from '../Base';
import {LabelName, Labels} from '../Labels';

export interface ThreadActions {
  archive: (messages: Message[]) => Promise<Response>;
  keep: (messages: Message[]) => Promise<Response>;
}

interface ThreadsState {
  threads: gapi.client.gmail.Thread[];
}

export interface UpdateThreadListAction {
  removeThreadId?: string;
  threads?: gapi.client.gmail.Thread[];
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

  useEffect(() => {
    if (loadingThreads !== LoadState.loading) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      const threads = (await fetchThreads(`in:inbox -in:${LabelName.keep}`))
        .threads;
      if (threads) {
        // TODO: Fetch message data to get the dates so we can sort by date.
        updateThreadListState({threads});
      }
      setLoadingThreads(LoadState.loaded);
    })();
  }, [loadingThreads]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      GoogleSignin.configure({
        scopes: [
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/contacts.readonly',
        ],
        webClientId:
          '957024671877-pmopl7t9j5vtieu207p56slhr7h1pkui.apps.googleusercontent.com', // client ID of type WEB for your server (needed to verify user ID and offline access)
        iosClientId:
          '957024671877-4eu314jmn3c60neao556ltfa025u9ao3.apps.googleusercontent.com', // [iOS] optional, if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
        // offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
        //hostedDomain: '', // specifies a hosted domain restriction
        //loginHint: '', // [iOS] The user's ID, or email address, to be prefilled in the authentication UI if possible. [See docs here](https://developers.google.com/identity/sign-in/ios/api/interface_g_i_d_sign_in.html#a0a68c7504c31ab0b728432565f6e33fd)
        //forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
        //accountName: '', // [Android] specifies an account name on the device that should be used
      });

      await GoogleSignin.hasPlayServices();

      try {
        await GoogleSignin.signInSilently();
      } catch (error) {
        if (error.code !== statusCodes.SIGN_IN_REQUIRED) {
          console.log('Sign in failed', JSON.stringify(error));
          return;
        }

        try {
          await GoogleSignin.signIn();
        } catch (nestedError) {
          console.log('Sign in failed', JSON.stringify(nestedError));
          if (nestedError.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flow
          } else if (nestedError.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
          } else if (
            nestedError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
          ) {
            // play services not available or outdated
          } else {
            // some other error happened
          }
        }
      }

      await saveAccessToken((await GoogleSignin.getTokens()).accessToken);
      await Labels.init();
      setLoadingThreads(LoadState.loading);
    })();
  }, []);

  const threadActions: ThreadActions = {
    archive: (messages: Message[]) => {
      return archiveMessages(messages.map((x) => defined(x.id)));
    },

    keep: async (messages: Message[]) => {
      const keepLabel = await Labels.getOrCreateLabel(LabelName.keep);
      return applyLabelToMessages(
        keepLabel.getId(),
        messages.map((x) => defined(x.id)),
      );
    },
  };

  // TODO: Once we take message fetching out of Card creation, only prerender
  // one card below the most recently swiped card. Until then, render more cards
  // and prevent rendering their messages to avoid getting stalled on slow
  // network.
  const numCardsRendered = 10;
  const cards = threadListState.threads
    .slice(0, numCardsRendered)
    .map((x, index) => {
      const threadId = defined(x.id);
      return (
        <Card
          key={threadId}
          threadId={threadId}
          actions={threadActions}
          cardSwipedAway={updateThreadListState}
          preventRenderMessages={index > 2}
        />
      );
    });

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
      <SafeAreaView style={style.view}>
        {/* Wrapper View prevents absolutely positioned Cards from escaping the safe area. */}
        <View style={style.view}>
          {cards.length ? (
            cards
          ) : (
            <Text>
              {loadingThreads !== LoadState.loaded ? (
                'Loading...'
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
