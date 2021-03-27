import { Message } from '../Message';

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const htmlHeader =
  '<meta name="viewport" content="width=device-width, initial-scale=1"><style>body, html { margin: 0; pointer-events: none; user-select: none}</style>';

const style = StyleSheet.create({
  header: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
  },
  addresses: {
    flex: 1,
  },
  font: {
    fontSize: 12,
  },
  headerRow: {
    marginTop: 4,
    color: '#444',
  },
  bold: {
    fontWeight: 'bold',
  },
});

export function MessageComponent(props: { message: Message }): JSX.Element {
  const message = props.message;
  const headerRowStyles = [style.headerRow, style.font];
  return (
    <>
      <View style={style.header}>
        <View style={style.addresses}>
          {/* Need to do this ugly || undefined thing in case the value is empty string,
          in which case we don't want to return an empty string outside of a Text element.
          So make the we return undefined in that case. */}
          {(message.from || undefined) && (
            <Text style={[style.bold, style.font]} numberOfLines={1}>
              {message.getFromNames().join(', ')}
            </Text>
          )}
          {(message.to || undefined) && (
            <Text style={headerRowStyles} numberOfLines={1}>
              <Text style={style.bold}>to:</Text> {message.getToNames().join(', ')}
            </Text>
          )}
          {(message.cc || undefined) && (
            <Text style={headerRowStyles} numberOfLines={1}>
              <Text style={style.bold}>cc:</Text> {message.getCcNames().join(', ')}
            </Text>
          )}
        </View>
        <Text style={headerRowStyles} numberOfLines={1}>
          {message.formatDate()}
        </Text>
      </View>
      <WebView
        scrollEnabled={false}
        javaScriptEnabled={false}
        source={{ html: htmlHeader + message.getHtmlOrPlain() }}
      />
    </>
  );
}
