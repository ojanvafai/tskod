import React, {useEffect, useState} from 'react';
import {Animated, Text} from 'react-native';
import {
  GestureHandlerGestureEventNativeEvent,
  GestureHandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerEventExtra,
  State,
} from 'react-native-gesture-handler';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import {archiveMessages, fetchMessages} from './Gapi';

interface CardProps {
  snippet: string;
  threadId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assert(predicate: any, message?: string): void {
  if (!predicate) {
    throw new Error(message ?? 'This should never happen.');
  }
}

function assertNotReached(message?: string): void {
  assert(false, message);
}

function defined<T>(variable: T | undefined): T {
  if (variable === undefined) {
    throw new Error('This should never happen.');
  }
  return variable;
}

const MIN_PAN_FOR_ACTION = 150;
const SPRING_CONFIG = {tension: 20, friction: 7};

export function Card(props: CardProps): JSX.Element {
  const pan = new Animated.ValueXY();

  const [messages, setMessages] = useState([] as gapi.client.gmail.Message[]);

  useEffect(() => {
    (async (): Promise<void> => {
      const messageData = await fetchMessages(props.threadId);
      if (messageData.messages !== undefined) {
        setMessages(messageData.messages);
      }
    })();
  }, [props.threadId]);

  const handleGesture = Animated.event(
    [{nativeEvent: {translationX: pan.x, translationY: pan.y}}],
    {
      useNativeDriver: true,
    },
  );

  const handleGestureStateChange = async (
    evt: GestureHandlerStateChangeEvent,
  ): Promise<void> => {
    const nativeEvent = (evt.nativeEvent as unknown) as GestureHandlerGestureEventNativeEvent &
      PanGestureHandlerEventExtra;
    if (evt.nativeEvent.state === State.END) {
      if (
        Math.abs(nativeEvent.translationX) < MIN_PAN_FOR_ACTION &&
        Math.abs(nativeEvent.translationY) < MIN_PAN_FOR_ACTION
      ) {
        Animated.spring(pan, {
          ...SPRING_CONFIG,
          toValue: {x: 0, y: 0},
          velocity: nativeEvent.velocityX,
          useNativeDriver: true,
        }).start();
      } else {
        pan.setValue({x: 0, y: 0});
        if (nativeEvent.translationX < -MIN_PAN_FOR_ACTION) {
          if (!messages.length) {
            // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
            assertNotReached('Have not loaded message data yet.');
          }
          await archiveMessages(messages.map((x) => defined(x.id)));
        } else if (nativeEvent.translationX > MIN_PAN_FOR_ACTION) {
          console.log('Swipe right');
        }
      }
    }
  };

  const cardStyle = {
    margin: 15,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.32,
    shadowRadius: 5.46,
    backgroundColor: Colors.white,
    elevation: 9,
    transform: [{translateX: pan.x}],
  };

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGestureStateChange}>
      <Animated.View style={cardStyle}>
        <Text>{props.snippet}</Text>
        {messages.length
          ? messages.map((x) => <Text>MessageID: {x.id}</Text>)
          : undefined}
      </Animated.View>
    </PanGestureHandler>
  );
}
