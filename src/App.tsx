import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-community/google-signin';

import { Card } from './Card';
import { Gapi } from './Gapi';

const styles = StyleSheet.create({
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
});

interface TeaMailAppProps {
}

interface TeaMailAppState {
  userInfo: any | null;
  threads: gapi.client.gmail.Thread[] | undefined;
}

class App extends React.Component<TeaMailAppProps, TeaMailAppState> {
  constructor(props: TeaMailAppProps) {
    super(props);
    this.state = {
      userInfo: null,
      threads: undefined,
    };
  }

  componentDidMount() {
    this._signIn();
  }

  _signIn = async () => {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/gmail.modify',
        "https://www.googleapis.com/auth/contacts.readonly"],
      webClientId: '957024671877-pmopl7t9j5vtieu207p56slhr7h1pkui.apps.googleusercontent.com', // client ID of type WEB for your server (needed to verify user ID and offline access)
      // offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
      //hostedDomain: '', // specifies a hosted domain restriction
      //loginHint: '', // [iOS] The user's ID, or email address, to be prefilled in the authentication UI if possible. [See docs here](https://developers.google.com/identity/sign-in/ios/api/interface_g_i_d_sign_in.html#a0a68c7504c31ab0b728432565f6e33fd)
      //forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
      //accountName: '', // [Android] specifies an account name on the device that should be used
      iosClientId: '957024671877-4eu314jmn3c60neao556ltfa025u9ao3.apps.googleusercontent.com', // [iOS] optional, if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
    });

    await GoogleSignin.hasPlayServices();

    try {
      const userInfo = await GoogleSignin.signIn();
      Gapi.saveAccessToken((await GoogleSignin.getTokens()).accessToken);
      const threads = (await Gapi.fetchThreads()).threads;
      this.setState({ userInfo, threads });
    } catch (error) {
      console.log("FAILED");
      console.log(JSON.stringify(error))
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
      }
    }
  }

  render() {
    const threads = this.state.threads;
    return (
      <React.Fragment>
        <StatusBar barStyle="light-content" />
        <SafeAreaView>
          {threads && <Card snippet={threads[0].snippet as string} />}
        </SafeAreaView>
      </React.Fragment>
    );
  };
};

export default App;
