import {Message} from '../Message';

import React from 'react';
import {Text} from 'react-native';
import {WebView} from 'react-native-webview';

const META_VIEWPORT =
  '<meta name="viewport" content="width=device-width, initial-scale=1">';

export function MessageComponent(props: {message: Message}): JSX.Element {
  const message = props.message;
  return (
    <>
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
      </Text>
      <WebView
        scrollEnabled={false}
        source={{html: META_VIEWPORT + message.getHtmlOrPlain()}}
      />
    </>
  );
}
