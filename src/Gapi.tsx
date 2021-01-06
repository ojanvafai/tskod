let accessToken: string;

function saveAccessToken(token: string) {
  accessToken = token;
}

function encodeParameters(url: string, obj: { [property: string]: string | number }) {
  return `${url}?${Object.entries(obj).map(p => `${encodeURIComponent(p[0])}=${encodeURIComponent(p[1])}`).join("&")}`;
}

async function fetchJson<T>({ url, postBody, queryParameters }: { url: string, postBody?: T, queryParameters?: { [property: string]: string } }) {
  const fullUrl = encodeParameters(url, {
    "alt": "json",
    "max-results": 100,
    ...queryParameters,
  });

  const headers = new Headers({
    "Content-Type": "application/json",
    "Authorization": "",
    "Accept": "*/*",
    "Access-Control-Allow-Headers": "*",
    "X-Requested-With": "XMLHttpRequest"
  });
  headers.set("Authorization", 'Bearer ' + accessToken);

  const options: RequestInit = { headers };
  if (postBody) {
    options.method = 'POST';
    options.body = JSON.stringify(postBody);
  } else {
    options.method = 'GET';
  }
  const response = await fetch(fullUrl, options);
  return response.json();
}

function fetchContacts() {
  return fetchJson({ url: "https://www.google.com/m8/feeds/contacts/default/full" });
}

const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
const THREADS_URL = `${GMAIL_BASE_URL}/threads`;
const MESSAGES_URL = `${GMAIL_BASE_URL}/messages`;

function fetchThreads(): Promise<gapi.client.gmail.ListThreadsResponse> {
  return fetchJson({ url: THREADS_URL, queryParameters: { q: 'in:inbox' } });
}

function fetchMessages(threadId: string): Promise<gapi.client.gmail.Thread> {
  return fetchJson({ url: `${THREADS_URL}/${threadId}` });
}

interface BatchModifyData {
  "ids": string[];
  "addLabelIds": string[];
  "removeLabelIds": string[];
}

function archiveMessages(messageIds: string[]) {
  return fetchJson<BatchModifyData>({
    url: `${MESSAGES_URL}/batchModify`,
    postBody: {
      "ids": messageIds,
      "addLabelIds": [],
      "removeLabelIds": ['INBOX'],
    }
  });
}

export {
  saveAccessToken,
  fetchContacts,
  fetchThreads,
  fetchMessages,
  archiveMessages,
};
