interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}
type JsonArray = Array<string | number | boolean | Date | Json | JsonArray>;

let accessToken: string;

export function saveAccessToken(token: string): void {
  accessToken = token;
}

function encodeParameters(
  url: string,
  obj: {[property: string]: string | number},
): string {
  return `${url}?${Object.entries(obj)
    .map((p) => `${encodeURIComponent(p[0])}=${encodeURIComponent(p[1])}`)
    .join('&')}`;
}

function gapiFetch<T>({
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
  return fetch(fullUrl, options);
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
