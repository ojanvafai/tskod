import Realm from 'realm';
//import BSON from 'bson';

async function signInRealm(token: string): Promise<void> {
  const app = new Realm.App({id: 'teamail-qvqif'});

  console.log('TOKEN');
  console.log(token);
  const credentials = Realm.Credentials.google(token);
  try {
    const user = await app.logIn(credentials);
    console.log('Successful signin');
    console.log(user);
  } catch (err) {
    console.error('Failed to log in', err);
  }
}

export {signInRealm};
