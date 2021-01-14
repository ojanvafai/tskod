import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, Dimensions} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  //useDerivedValue,
  //withSpring,
} from 'react-native-reanimated';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import {fetchMessages} from '../Gapi';
import {Message} from '../Message';
import {UpdateThreadListAction, ThreadActions} from './App';
import {MessageComponent} from './MessageComponent';
import {assertNotReached} from '../Base';

interface CardProps {
  threadId: string;
  actions: ThreadActions;
  cardSwipedAway: React.Dispatch<UpdateThreadListAction>;
  preventRenderMessages: boolean;
}

const MIN_PAN_FOR_ACTION = 100;
const SPRING_CONFIG = {tension: 20, friction: 7};
const WINDOW_WIDTH = Dimensions.get('window').width;

export function Card(props: CardProps): JSX.Element {
  const panX = useSharedValue(0);

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

  async function swipeLeft(): Promise<void> {
    if (!messages.length) {
      // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
      assertNotReached('Have not loaded message data yet.');
    }
    await props.actions.archive(messages);
  }

  async function swipeRight(): Promise<void> {
    if (!messages.length) {
      // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
      assertNotReached('Have not loaded message data yet.');
    }
    await props.actions.keep(messages);
  }

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_) => {
      //
    },
    onActive: (event, _) => {
      panX.value = event.translationX;
    },
    onEnd: (event) => {
      if (
        Math.abs(event.translationX) < MIN_PAN_FOR_ACTION &&
        Math.abs(event.translationY) < MIN_PAN_FOR_ACTION
      ) {
        panX.value = withSpring(0, {
          ...SPRING_CONFIG,
          velocity: event.velocityX,
        });
      } else {
        panX.value = withSpring(
          Math.sign(event.translationX) * WINDOW_WIDTH,
          {
            ...SPRING_CONFIG,
            velocity: event.velocityX,
          },
          (_) => {
            runOnJS(props.cardSwipedAway)({removeThreadId: props.threadId});
          },
        );
        if (event.translationX < -MIN_PAN_FOR_ACTION) {
          runOnJS(swipeLeft)();
        } else if (event.translationX > MIN_PAN_FOR_ACTION) {
          runOnJS(swipeRight)();
        }
      }
    },
  });

  const cardStyleAnimated = useAnimatedStyle(() => {
    return {
      transform: [{translateX: panX.value}],
    };
  });

  const cardStyle = StyleSheet.create({
    card: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
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
    },
  });

  // Since we're only showing one screen worth of messages, run render the most recent ones.
  const numMessageToRender = 3;

  const subject = messages.length ? (
    <Text>{messages[0].subject}</Text>
  ) : undefined;
  const messageComponents =
    !props.preventRenderMessages &&
    messages
      .slice(messages.length - numMessageToRender)
      .map((x) => <MessageComponent key={x.id} message={x} />);

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      {/* @ts-ignore the type doesn't allow position:absolute...the type seems to be wrong. */}
      <Animated.View style={[cardStyle.card, cardStyleAnimated]}>
        {subject}
        {messageComponents}
      </Animated.View>
    </PanGestureHandler>
  );
}
