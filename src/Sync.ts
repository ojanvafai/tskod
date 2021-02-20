import Realm from 'realm';
import BSON from 'bson';

const TeamailSchema = {
  name: 'TeamailCollection',
  properties: {
    _id: 'objectId',
    key: 'string',
    messageId: 'int',
  },
  primaryKey: '_id',
};

async function signInRealm(token: string): Promise<void> {
  const app = new Realm.App({ id: 'teamail-qvqif' });

  const credentials = Realm.Credentials.google(token);
  let user = null;
  try {
    user = await app.logIn(credentials);
  } catch (err) {
    console.error('Failed to log in', err);
    return;
  }

  let realm: null | Realm = null;
  try {
    const config = {
      schema: [TeamailSchema],
      sync: {
        user: user,
        // TODO - partition by user email!
        partitionValue: 'test',
      },
    };
    realm = await Realm.open(config);
  } catch (e) {
    console.log('FAILED to open realm');
    console.log(e.message);
    return;
  }

  // Create Realm objects and write to local storage.
  realm.write(() => {
    if (realm === null) {
      return;
    }
    realm.create('TeamailCollection', {
      _id: new BSON.ObjectId(),
      key: 'test',
      messageId: 1000,
    });
  });

  // Remember to close the realm when finished.
  realm.close();
}

export { signInRealm };
