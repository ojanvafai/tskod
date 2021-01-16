import {Message} from '../Message';

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';

const htmlHeader =
  '<meta name="viewport" content="width=device-width, initial-scale=1"><style>body, html { margin: 0 }</style>';

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

export function MessageComponent(props: {message: Message}): JSX.Element {
  const message = props.message;
  const headerRowStyles = [style.headerRow, style.font];
  return (
    <>
      <View style={style.header}>
        <View style={style.addresses}>
          {message.from && (
            <Text style={[style.bold, style.font]} numberOfLines={1}>
              {message.getFromNames()}
            </Text>
          )}
          {message.to && (
            <Text style={headerRowStyles} numberOfLines={1}>
              <Text style={style.bold}>to:</Text> {message.getToNames()}
            </Text>
          )}

          {message.cc && (
            <Text style={headerRowStyles} numberOfLines={1}>
              <Text style={style.bold}>cc:</Text> {message.getCcNames()}
            </Text>
          )}
        </View>
        <Text style={headerRowStyles} numberOfLines={1}>
          {message.formatDate()}
        </Text>
      </View>
      <WebView
        scrollEnabled={false}
        source={{html: htmlHeader + message.getHtmlOrPlain()}}
      />
    </>
  );
}
