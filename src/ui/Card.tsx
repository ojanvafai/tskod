import React, { useState } from 'react';
import { StyleSheet, Text, Dimensions, View, Animated } from 'react-native';

import {
  GestureHandlerGestureEventNativeEvent,
  GestureHandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerEventExtra,
  State,
} from 'react-native-gesture-handler';

import { Thread } from '../Thread';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { assert } from '../Base';

import { modifyMessages } from '../Gapi';
import { LabelName, Labels } from '../Labels';
import { Message } from '../Message';
import { UpdateThreadListAction } from './App';
import { MessageComponent } from './MessageComponent';
import { assertNotReached } from '../Base';

interface CardProps {
  thread: Thread;
  onCardOffScreen: React.Dispatch<UpdateThreadListAction>;
  preventRenderMessages: boolean;
  angleOffset: number;
  xOffset: number;
}

const MIN_PAN_FOR_ACTION = 100;
const TOOLBAR_OFFSET = 75;
const SPRING_CONFIG = { tension: 20, friction: 7 };

const WINDOW_WIDTH = Dimensions.get('window').width + TOOLBAR_OFFSET;

export function Card(props: CardProps): JSX.Element {
  const messages: Message[] = props.thread.messages();
  const firstAndLastMessages = props.thread.firstAndLastMessages() ?? [];

  const pan = new Animated.ValueXY();

  // Take the swipe action immediately when the user lifts their finger in
  // parallel with swiping the card offscreen.
  const [hasSwiped, setHasSwiped] = useState(false);

  async function handleSwipe(addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    if (hasSwiped) {
      return;
    }
    setHasSwiped(true);
    assert(messages.length);
    await modifyMessages(messages, addLabelIds, removeLabelIds);
  }

  async function swipeLeft(): Promise<void> {
    await handleSwipe([], ['INBOX']);
  }

  async function swipeRight(): Promise<void> {
    const [keep, emptyDaily] = await Promise.all([
      Labels.getOrCreateLabel(LabelName.keep),
      Labels.getOrCreateLabel(LabelName.emptyDaily),
    ]);
    await handleSwipe([keep.getId(), emptyDaily.getId()], []);
  }

  const handleGesture = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    {
      useNativeDriver: true,
    },
  );

  const handleGestureStateChange = async (evt: GestureHandlerStateChangeEvent): Promise<void> => {
    const nativeEvent = (evt.nativeEvent as unknown) as GestureHandlerGestureEventNativeEvent &
      PanGestureHandlerEventExtra;
    if (evt.nativeEvent.state === State.END) {
      if (Math.abs(nativeEvent.translationX) < MIN_PAN_FOR_ACTION) {
        Animated.spring(pan, {
          ...SPRING_CONFIG,
          toValue: { x: 0, y: 0 },
          velocity: nativeEvent.velocityX,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(pan, {
          ...SPRING_CONFIG,
          toValue: {
            x: Math.sign(nativeEvent.translationX) * WINDOW_WIDTH,
            y: 0,
          },
          velocity: nativeEvent.velocityX,
          useNativeDriver: true,
        });
        if (nativeEvent.translationX < -MIN_PAN_FOR_ACTION) {
          if (!messages.length) {
            // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
            assertNotReached('Have not loaded message data yet.');
          }
          await swipeLeft();
        } else if (nativeEvent.translationX > MIN_PAN_FOR_ACTION) {
          if (!messages.length) {
            // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
            assertNotReached('Have not loaded message data yet.');
          }
          await swipeRight();
        }
      }
    }
  };

  const style = StyleSheet.create({
    // Have the card's drag area be the full size of the screen so that the user
    // can't drag the card behind the one on top by grabbing the edge that's
    // sticking out.
    card: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,

      padding: 16,

      transform: [
        {
          rotate: `${props.angleOffset}deg`,
        },
        // @ts-expect-error StyleSheet.create type doesn't like getting an
        // Animated.Node<number> instead of a plain number.
        { translateX: pan.x },
      ],
    },
    visibleCard: {
      flex: 1,
      padding: 12,
      paddingBottom: 0,
      backgroundColor: Colors.white,

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      elevation: 1,
    },
    toolbar: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    right: {
      right: -TOOLBAR_OFFSET,
    },
    left: {
      left: -TOOLBAR_OFFSET,
    },
    toolbarButton: {
      width: 50,
      height: 50,
      backgroundColor: '#ffffffee',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 0,
    },
    buttonText: {
      textAlign: 'center',
    },
    subject: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    elidedMessageCount: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#ccc',
      alignItems: 'center',
      padding: 8,
    },
  });

  const subject = firstAndLastMessages.length ? (
    <Text style={style.subject}>{firstAndLastMessages[0].subject}</Text>
  ) : undefined;

  let messageComponents;
  if (!props.preventRenderMessages && firstAndLastMessages.length) {
    messageComponents = firstAndLastMessages.map((x) => (
      <MessageComponent key={x.id()} message={x} />
    ));
    if (messages.length > 1) {
      const elidedMessageCount = messages.length - 2;
      // Need to use a view because borders on only one side don't work on Text.
      const divider = (
        <View key='messageCount' style={style.elidedMessageCount}>
          <Text>
            {elidedMessageCount > 0
              ? `${elidedMessageCount} more message${elidedMessageCount > 1 && 's'}`
              : ' '}
          </Text>
        </View>
      );
      messageComponents.splice(1, 0, divider);
    }
  }

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGestureStateChange}
    >
      {/* @ts-ignore the type doesn't allow position:absolute...the type seems to be wrong. */}
      <Animated.View style={style.card}>
        <View style={style.visibleCard}>
          {subject}
          {messageComponents}
          <View style={[style.toolbar, style.right]}>
            <View style={style.toolbarButton}>
              <Text style={style.buttonText}>archive</Text>
            </View>
          </View>
          <View style={[style.toolbar, style.left]}>
            <View style={style.toolbarButton}>
              <Text style={style.buttonText}>{LabelName.emptyDaily.split('/')[2]}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}
