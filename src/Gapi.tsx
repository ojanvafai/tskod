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

function fetchThreads(): Promise<gapi.client.gmail.ListThreadsResponse> {
  return fetchJson("https://gmail.googleapis.com/gmail/v1/users/me/threads");
}

let out = {
  saveAccessToken,
  fetchContacts,
  fetchThreads,
};
export { out as Gapi };
