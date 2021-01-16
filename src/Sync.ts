import Realm from 'realm';
//import BSON from 'bson';

async function testRealmLogin(): Promise<void> {
  const app = new Realm.App({id: 'teamail-qvqif'});

  // https://realm.io/docs/javascript/latest/#missing-realm-constructor
  const credentials = Realm.Credentials.anonymous();
  try {
    const user = await app.logIn(credentials);
    console.log(user);
  } catch (err) {
    console.error('Failed to log in', err);
  }
}

export {testRealmLogin};
