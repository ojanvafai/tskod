import {Message} from '../Message';

import React from 'react';
import {Text} from 'react-native';

export function MessageComponent(props: {message: Message}): JSX.Element {
  const message = props.message;
  return (
    <Text>
      {'\n'}
      {message.from && (
        <Text>
          From: {message.from}
          {'\n'}
        </Text>
      )}
      {message.to && (
        <Text>
          To: {message.to}
          {'\n'}
        </Text>
      )}
      {message.cc && (
        <Text>
          CC: {message.cc}
          {'\n'}
        </Text>
      )}
      {message.date}
      {'\n\n'}
      {message.getHtmlOrPlain()}
    </Text>
  );
}
