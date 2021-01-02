/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  LogBox,
  AppState,
} from 'react-native';

import {
  Header,
  LearnMoreLinks,
  Colors,
  DebugInstructions,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-community/google-signin';

import { Card } from './Card';

declare const global: { HermesInternal: null | {} };

const styles = StyleSheet.create({
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
});

interface AppProps {

}

let ACCESS_TOKEN = 'FILL THIS IN';

const defaultheader = function () {
  return {
    method: null,
    body: null,
    crossDomain: true,
    cache: false,
    async: false,
    timeout: 3000,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "",
      "Accept": "*/*",
      "Access-Control-Allow-Headers": "*",
      "X-Requested-With": "XMLHttpRequest"
    },
  };
};
function transformRequest(obj: any) {
  var str = [];
  for (var p in obj)
    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  return str.join("&");
}
const getContacts = () => {
  const header: any = defaultheader();
  let params = {
    "alt": "json",
    "max-results": 100
  };
  header.method = 'GET';
  let url = "https://www.google.com/m8/feeds/contacts/default/full?";
  var suburl = transformRequest(params);
  url = url + suburl;
  header.headers["Authorization"] = 'Bearer ' + ACCESS_TOKEN;
  fetch(url, header)
    .then((response) => {
      setTimeout(() => { let a = 0; }, 0);
      return response.json()
    })
    .then((responseJson) => {
      console.log("responseJson=", responseJson);
    })
    .catch((error) => {
      console.log("An error occurred.Please try again", error);
    });
}

async function getThreads(): Promise<gapi.client.gmail.ListThreadsResponse> {
  const header: any = defaultheader();
  let params = {
    "alt": "json",
    "max-results": 100
  };
  header.method = 'GET';
  let url = "https://gmail.googleapis.com/gmail/v1/users/me/threads";
  var suburl = transformRequest(params);
  url = url + "?" + suburl;
  header.headers["Authorization"] = 'Bearer ' + ACCESS_TOKEN;
  const response = await fetch(url, header);
  return response.json() as gapi.client.gmail.ListThreadsResponse;
}

interface TeaMailAppState {
  userInfo: any | null;
  threads: gapi.client.gmail.Thread[] | undefined;
}

class App extends React.Component<AppProps, TeaMailAppState> {
  constructor(props: AppProps) {
    super(props);
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
    this.state = {
      userInfo: null,
      threads: undefined,
    };
  }
  componentDidMount() {
    this._signIn();
  }
  _signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      ACCESS_TOKEN = (await GoogleSignin.getTokens()).accessToken;
      const threads = (await getThreads()).threads;
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
          <GoogleSigninButton
            style={{ width: 192, height: 48 }}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={this._signIn}
            disabled={false/*this.state.isSigninInProgress*/} />
          {threads && <Card snippet={threads[0].snippet as string} />}
        </SafeAreaView>
      </React.Fragment>
    );
  };
};

export default App;

// iOS firebase needs the following swift bits hooked up
// import UIKit
// import Firebase
// @UIApplicationMain
// class AppDelegate: UIResponder, UIApplicationDelegate {
//   var window: UIWindow?
//   func application(_ application: UIApplication,
//     didFinishLaunchingWithOptions launchOptions:
//       [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
//     FirebaseApp.configure()
//     return true
//   }
// } 