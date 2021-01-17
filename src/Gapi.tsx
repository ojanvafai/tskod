import {
  GoogleSignin,
  statusCodes,
  User,
} from '@react-native-community/google-signin';
import {signInRealm} from './Sync';

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}
type JsonArray = Array<string | number | boolean | Date | Json | JsonArray>;

let accessToken: string;

export async function login(): Promise<void> {
  GoogleSignin.configure({
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/contacts.readonly',
    ],
    webClientId:
      '957024671877-pmopl7t9j5vtieu207p56slhr7h1pkui.apps.googleusercontent.com', // client ID of type WEB for your server (needed to verify user ID and offline access)
    iosClientId:
      '957024671877-4eu314jmn3c60neao556ltfa025u9ao3.apps.googleusercontent.com', // [iOS] optional, if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
    offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
    //forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  });

  await GoogleSignin.hasPlayServices();

  let user: User | null = null;

  try {
    user = await GoogleSignin.signInSilently();
  } catch (error) {
    if (error.code !== statusCodes.SIGN_IN_REQUIRED) {
      console.log('Sign in failed', JSON.stringify(error));
      return;
    }

    try {
      user = await GoogleSignin.signIn();
    } catch (nestedError) {
      console.log('Sign in failed', JSON.stringify(nestedError));
      if (nestedError.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (nestedError.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (nestedError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
      }
    }
  }

  accessToken = (await GoogleSignin.getTokens()).accessToken;
  console.log('Before realm login');
  if (user !== null && user.serverAuthCode !== null) {
    await signInRealm(user.serverAuthCode);
  } else {
    console.log('null user or auth code');
    console.log(JSON.stringify(user));
  }
  console.log('After Realm Login');
}

function encodeParameters(
  url: string,
  obj: {[property: string]: string | number},
): string {
  return `${url}?${Object.entries(obj)
    .map((p) => `${encodeURIComponent(p[0])}=${encodeURIComponent(p[1])}`)
    .join('&')}`;
}

async function gapiFetch<T>({
  url,
  postBody,
  queryParameters,
}: {
  url: string;
  postBody?: T;
  queryParameters?: {[property: string]: string};
}): Promise<Response> {
  const fullUrl = encodeParameters(url, {
    alt: 'json',
    'max-results': 100,
    ...queryParameters,
  });

  const headers = new Headers({
    'Content-Type': 'application/json',
    Authorization: '',
    Accept: '*/*',
    'Access-Control-Allow-Headers': '*',
    'X-Requested-With': 'XMLHttpRequest',
  });
  headers.set('Authorization', 'Bearer ' + accessToken);

  const options: RequestInit = {headers};
  if (postBody) {
    options.method = 'POST';
    options.body = JSON.stringify(postBody);
  } else {
    options.method = 'GET';
  }
  let response = await fetch(fullUrl, options);
  // 401 happens when auth credentials expire (and probably in other cases too).
  if (response.status === 401) {
    await login();
    response = await fetch(fullUrl, options);
  }
  return response;
}

async function gapiFetchJson<T>({
  url,
  postBody,
  queryParameters,
}: {
  url: string;
  postBody?: T;
  queryParameters?: {[property: string]: string};
}): Promise<Json> {
  const response = await gapiFetch<T>({url, postBody, queryParameters});
  return response.json();
}

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const THREADS_URL = `${GMAIL_BASE_URL}/threads`;
const MESSAGES_URL = `${GMAIL_BASE_URL}/messages`;
const LABELS_URL = `${GMAIL_BASE_URL}/labels`;

export function fetchThreads(
  query: string,
): Promise<gapi.client.gmail.ListThreadsResponse> {
  return gapiFetchJson({
    url: THREADS_URL,
    queryParameters: {q: query},
  });
}

export function fetchMessageIdsAndLabels(
  threadId: string,
): Promise<gapi.client.gmail.Thread> {
  return gapiFetchJson({
    url: `${THREADS_URL}/${threadId}`,
    queryParameters: {format: 'MINIMAL'},
  });
}

export function fetchMessageById(
  messageId: string,
): Promise<gapi.client.gmail.Message> {
  return gapiFetchJson({
    url: `${MESSAGES_URL}/${messageId}`,
    queryParameters: {
      // Fetching a new header involves adding it here and then parsing it in
      // Message.tsx.
      metadataHeaders: 'subject,from,to,cc,date',
    },
  });
}

export function fetchMessagesById(
  messageIds: string[],
): Promise<gapi.client.gmail.Message[]> {
  // TODO: Batch this per https://developers.google.com/gmail/api/guides/batch
  // to do a single network request instead of N requests.
  return Promise.all(messageIds.map((id) => fetchMessageById(id)));
}

interface BatchModifyData {
  ids: string[];
  addLabelIds: string[];
  removeLabelIds: string[];
}

// Batch modify has no response body, but still get's the wrapper response JSON.
export function archiveMessages(messageIds: string[]): Promise<Response> {
  return gapiFetch<BatchModifyData>({
    url: `${MESSAGES_URL}/batchModify`,
    postBody: {
      ids: messageIds,
      addLabelIds: [],
      removeLabelIds: ['INBOX'],
    },
  });
}

export function fetchLabels(): Promise<gapi.client.gmail.ListLabelsResponse> {
  return gapiFetchJson({
    url: LABELS_URL,
  });
}

export function createLabel(
  labelData: gapi.client.gmail.Label,
): Promise<gapi.client.gmail.Label> {
  return gapiFetchJson({
    url: LABELS_URL,
    postBody: labelData,
  });
}

// Batch modify has no response body, but still get's the wrapper response JSON.
export function applyLabelToMessages(
  labelId: string,
  messageIds: string[],
): Promise<Response> {
  return gapiFetch<BatchModifyData>({
    url: `${MESSAGES_URL}/batchModify`,
    postBody: {
      ids: messageIds,
      addLabelIds: [labelId],
      removeLabelIds: [],
    },
  });
}
