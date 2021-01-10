import React, {useEffect, useState} from 'react';
import {Animated, Dimensions, Text} from 'react-native';
import {
  GestureHandlerGestureEventNativeEvent,
  GestureHandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerEventExtra,
  State,
} from 'react-native-gesture-handler';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {assertNotReached} from '../Base';

import {fetchMessages} from '../Gapi';
import {Message} from '../Message';
import {ThreadActions} from './App';
import {MessageComponent} from './MessageComponent';

interface CardProps {
  threadId: string;
  actions: ThreadActions;
  cardSwipedAway: () => void;
}

const MIN_PAN_FOR_ACTION = 150;
const SPRING_CONFIG = {tension: 20, friction: 7};

export function Card(props: CardProps): JSX.Element {
  const pan = new Animated.ValueXY();

  const [messages, setMessages] = useState([] as Message[]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      const messageData = await fetchMessages(props.threadId);
      if (messageData.messages !== undefined) {
        setMessages(messageData.messages.map((x) => new Message(x)));
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
        Animated.spring(pan, {
          ...SPRING_CONFIG,
          toValue: {
            x:
              Math.sign(nativeEvent.translationX) *
              Dimensions.get('window').width,
            y: 0,
          },
          velocity: nativeEvent.velocityX,
          useNativeDriver: true,
        }).start(({finished}: {finished: boolean}) => {
          if (finished) {
            props.cardSwipedAway();
          }
        });
        if (nativeEvent.translationX < -MIN_PAN_FOR_ACTION) {
          if (!messages.length) {
            // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
            assertNotReached('Have not loaded message data yet.');
          }
          await props.actions.archive(messages);
        } else if (nativeEvent.translationX > MIN_PAN_FOR_ACTION) {
          if (!messages.length) {
            // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
            assertNotReached('Have not loaded message data yet.');
          }
          await props.actions.keep(messages);
        }
      }
    }
  };

  const cardStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    transform: [{translateX: pan.x}],

    margin: 15,
    padding: 4,

    backgroundColor: Colors.white,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.32,
    shadowRadius: 5.46,
    elevation: 9,
  };

  const subject = messages.length ? (
    <Text>{messages[0].subject}</Text>
  ) : undefined;
  const messageComponents = messages.map((x) => (
    <MessageComponent key={x.id} message={x} />
  ));

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGestureStateChange}>
      {/* @ts-ignore the type doesn't allow position:absolute...the type seems to be wrong. */}
      <Animated.View style={cardStyle}>
        {subject}
        {messageComponents}
      </Animated.View>
    </PanGestureHandler>
  );
}
