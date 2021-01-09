import {Message} from '../Message';

import React from 'react';
import {Text} from 'react-native';

export function MessageComponent(props: {message: Message}): JSX.Element {
  const message = props.message;
  return (
    <Text>
      {'\n'}
      {message.from && <Text>From: {message.from}</Text>}
      {'\n'}
      {message.to && <Text>To: {message.to}</Text>}
      {'\n'}
      {message.cc && <Text>CC: {message.cc}</Text>}
      {'\n'}
    </Text>
  );
}
