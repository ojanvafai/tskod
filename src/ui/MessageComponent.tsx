import {Message} from '../Message';

import React from 'react';
import {Text} from 'react-native';
import {WebView} from 'react-native-webview';

const htmlHeader =
  '<meta name="viewport" content="width=device-width, initial-scale=1"><style>body, html { margin: 0 }</style>';

export function MessageComponent(props: {message: Message}): JSX.Element {
  const message = props.message;
  return (
    <>
      <Text>
        {'\n'}
        {message.from && (
          <Text>
            {message.getFromAddresses()}
            {'\n'}
          </Text>
        )}
        {message.to && (
          <Text>
            to: {message.getToNames()}
            {'\n'}
          </Text>
        )}
        {message.cc && (
          <Text>
            cc: {message.getCcNames()}
            {'\n'}
          </Text>
        )}
        {message.formatDate()}
        {'\n'}
      </Text>
      <WebView
        scrollEnabled={false}
        source={{html: htmlHeader + message.getHtmlOrPlain()}}
      />
    </>
  );
}
