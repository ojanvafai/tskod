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
  obj: { [property: string]: string | number }
): string {
  return `${url}?${Object.entries(obj)
    .map((p) => `${encodeURIComponent(p[0])}=${encodeURIComponent(p[1])}`)
    .join("&")}`;
}

async function fetchJson<T>({
  url,
  postBody,
  queryParameters,
}: {
  url: string;
  postBody?: T;
  queryParameters?: { [property: string]: string };
}): Promise<Json> {
  const fullUrl = encodeParameters(url, {
    alt: "json",
    "max-results": 100,
    ...queryParameters,
  });

  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: "",
    Accept: "*/*",
    "Access-Control-Allow-Headers": "*",
    "X-Requested-With": "XMLHttpRequest",
  });
  headers.set("Authorization", "Bearer " + accessToken);

  const options: RequestInit = { headers };
  if (postBody) {
    options.method = "POST";
    options.body = JSON.stringify(postBody);
  } else {
    options.method = "GET";
  }
  const response = await fetch(fullUrl, options);
  return response.json();
}

const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
const THREADS_URL = `${GMAIL_BASE_URL}/threads`;
const MESSAGES_URL = `${GMAIL_BASE_URL}/messages`;

export function fetchThreads(): Promise<gapi.client.gmail.ListThreadsResponse> {
  return fetchJson({ url: THREADS_URL, queryParameters: { q: "in:inbox" } });
}

export function fetchMessages(
  threadId: string
): Promise<gapi.client.gmail.Thread> {
  return fetchJson({ url: `${THREADS_URL}/${threadId}` });
}

interface BatchModifyData {
  ids: string[];
  addLabelIds: string[];
  removeLabelIds: string[];
}

// Batch modify has no response body, but still get's the wrapper response JSON.
export function archiveMessages(messageIds: string[]): Promise<Json> {
  return fetchJson<BatchModifyData>({
    url: `${MESSAGES_URL}/batchModify`,
    postBody: {
      ids: messageIds,
      addLabelIds: [],
      removeLabelIds: ["INBOX"],
    },
  });
}
