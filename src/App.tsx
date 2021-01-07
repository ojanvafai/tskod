import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar} from 'react-native';

import {GoogleSignin, statusCodes} from '@react-native-community/google-signin';

import {Card} from './Card';
import {fetchThreads, saveAccessToken} from './Gapi';

function App(): JSX.Element {
  const [threads, setThreads] = useState([] as gapi.client.gmail.Thread[]);

  const _signIn = async (): Promise<void> => {
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

    saveAccessToken((await GoogleSignin.getTokens()).accessToken);

    const fetchedThreads = (await fetchThreads()).threads;
    if (fetchedThreads) {
      setThreads(fetchedThreads);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    _signIn();
  }, []);

  return (
    <React.Fragment>
      <StatusBar barStyle="light-content" />
      <SafeAreaView>
        {threads.length ? (
          <Card
            threadId={threads[0].id as string}
            snippet={threads[0].snippet as string}
          />
        ) : undefined}
      </SafeAreaView>
    </React.Fragment>
  );
}

export default App;
