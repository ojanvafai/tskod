let accessToken: string;

function saveAccessToken(token: string) {
  accessToken = token;
}

function encodeParameters(url: string, obj: { [property: string]: string | number }) {
  return `${url}?${Object.entries(obj).map(p => `${encodeURIComponent(p[0])}=${encodeURIComponent(p[1])}`).join("&")}`;
}

async function fetchJson(url: string) {
  const fullUrl = encodeParameters(url, {
    "alt": "json",
    "max-results": 100
  });

  const headers = new Headers({
    "Content-Type": "application/json",
    "Authorization": "",
    "Accept": "*/*",
    "Access-Control-Allow-Headers": "*",
    "X-Requested-With": "XMLHttpRequest"
  });
  headers.set("Authorization", 'Bearer ' + accessToken);

  const response = await fetch(fullUrl, { method: 'GET', headers });
  return response.json();
}

function fetchContacts() {
  return fetchJson("https://www.google.com/m8/feeds/contacts/default/full");
}

const THREADS_URL = "https://gmail.googleapis.com/gmail/v1/users/me/threads";

function fetchThreads(): Promise<gapi.client.gmail.ListThreadsResponse> {
  return fetchJson(THREADS_URL);
}

function fetchMessages(threadId: string): Promise<gapi.client.gmail.Thread> {
  return fetchJson(`${THREADS_URL}/${threadId}`);
}

let out = {
  saveAccessToken,
  fetchContacts,
  fetchThreads,
  fetchMessages,
};
export { out as Gapi };
