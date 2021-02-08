import {
  GoogleSignin,
  statusCodes,
  User,
} from '@react-native-community/google-signin';
import {defined} from './Base';
import {Message} from './Message';
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
  if (user !== null && user.serverAuthCode !== null) {
    await signInRealm(user.serverAuthCode);
  } else {
    console.log('null user or auth code', JSON.stringify(user));
  }
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
    console.log('Retrying credentials');
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

export async function fetchThreads(
  query: string,
): Promise<gapi.client.gmail.ListThreadsResponse> {
  const response = await gapiFetchJson({
    url: THREADS_URL,
    queryParameters: {q: query},
  });
  return response;
}

export async function fetchMessageIdsAndLabels(
  threadId: string,
): Promise<gapi.client.gmail.Thread> {
  const response = await gapiFetchJson({
    url: `${THREADS_URL}/${threadId}`,
    queryParameters: {format: 'MINIMAL'},
  });
  return response;
}

export async function fetchMessageById(
  messageId: string,
): Promise<gapi.client.gmail.Message> {
  const response = await gapiFetchJson({
    url: `${MESSAGES_URL}/${messageId}`,
    queryParameters: {
      // Fetching a new header involves adding it here and then parsing it in
      // Message.tsx.
      metadataHeaders: 'subject,from,to,cc,date',
    },
  });
  return response;
}

export function fetchMessagesByIds(
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

export async function fetchLabels(): Promise<gapi.client.gmail.ListLabelsResponse> {
  const response = await gapiFetchJson({
    url: LABELS_URL,
  });
  return response;
}

export async function createLabel(
  labelData: gapi.client.gmail.Label,
): Promise<gapi.client.gmail.Label> {
  const response = await gapiFetchJson({
    url: LABELS_URL,
    postBody: labelData,
  });
  return response;
}

export async function modifyThread(
  threadId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
): Promise<gapi.client.gmail.Thread> {
  const response = await gapiFetchJson({
    url: `${THREADS_URL}/${threadId}/modify`,
    postBody: {
      addLabelIds: addLabelIds,
      removeLabelIds: removeLabelIds,
    },
  });
  return response;
}

// Batch modify has no response body, but still get's the wrapper response JSON.
export async function modifyMessages(
  messages: Message[],
  addLabelIds: string[],
  removeLabelIds: string[],
): Promise<void> {
  const messageIds = messages.map((x) => x.id);
  await gapiFetch<BatchModifyData>({
    url: `${MESSAGES_URL}/batchModify`,
    postBody: {
      ids: messageIds,
      addLabelIds: addLabelIds,
      removeLabelIds: removeLabelIds,
    },
  });

  // Gmail API has bugs where there are messages that appear via threads.get,
  // but not messages.get. In those cases, modifying all the messages in the
  // thread isn't sufficient and we need to modify the whole thread. Try to
  // minimize the race condition of a new message coming in and being modified
  // as much as possible by fetching messages again to see if the modify didn't
  // take and only applying the modify to the whole thread if no new messages
  // have come in. This does not fix
  // https://issuetracker.google.com/issues/122167541 which probably needs to be
  // handled when pulling in the thread list by checking if the thread is
  // actually in the inbox as per the labels on its messages.
  const threadId = messages[0].threadId;
  const freshMessageResponse = await fetchMessageIdsAndLabels(threadId);
  const freshMessages = defined(freshMessageResponse.messages);

  const unknownMessages = freshMessages.filter(
    (x) => !messageIds.includes(defined(x.id)),
  );
  // New messages have come in since we initiated this modify action, so don't
  // modify the whole thread and live with this modify pontentially having
  // silently failed.
  if (unknownMessages.length) {
    return;
  }

  const allLabels = new Set(freshMessages.flatMap((x) => defined(x.labelIds)));
  if (
    addLabelIds.some((x) => !allLabels.has(x)) ||
    removeLabelIds.some((x) => allLabels.has(x))
  ) {
    await modifyThread(threadId, addLabelIds, removeLabelIds);
  }
}

export function archiveMessages(messages: Message[]): Promise<void> {
  return modifyMessages(messages, [], ['INBOX']);
}
