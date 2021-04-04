import React, { useState, useRef } from 'react';
import { StyleSheet, Text, Dimensions, View, Animated } from 'react-native';

import {
  GestureHandlerGestureEventNativeEvent,
  GestureHandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerEventExtra,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

import { Thread } from '../Thread';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { assert } from '../Base';

// import { modifyMessages } from '../Gapi';
import { LabelName, Labels } from '../Labels';
import { Message } from '../Message';
import { UpdateThreadListAction } from './App';
import { MessageComponent } from './MessageComponent';

interface CardProps {
  thread: Thread;
  onCardOffScreen: React.Dispatch<UpdateThreadListAction>;
  preventRenderMessages: boolean;
  angleOffset: number;
  xOffset: number;
}

const MIN_PAN_FOR_ACTION = 100;
// OJAN: What should this value be? 20 seems too large.
const MIN_PAN_FOR_DRAG = 20;
const TOOLBAR_OFFSET = 75;
const SPRING_CONFIG = { tension: 20, friction: 7 };

const VERTICAL_TOOLBAR_OFFSET = 1.5 * TOOLBAR_OFFSET;
const WINDOW_WIDTH = Dimensions.get('window').width + TOOLBAR_OFFSET;
const WINDOW_HEIGHT = Dimensions.get('window').height + VERTICAL_TOOLBAR_OFFSET;

enum PanningDirection {
  default,
  horizontal,
  vertical,
}

export function Card(props: CardProps): JSX.Element {
  const messages: Message[] = props.thread.messages();
  const firstAndLastMessages = props.thread.firstAndLastMessages() ?? [];

  const pan = useRef(new Animated.ValueXY()).current;
  const panningDirection = useRef(PanningDirection.default);

  // Take the swipe action immediately when the user lifts their finger in
  // parallel with swiping the card offscreen.
  const [hasSwiped, setHasSwiped] = useState(false);

  async function handleSwipe(_addLabelIds: string[], _removeLabelIds: string[]): Promise<void> {
    if (hasSwiped) {
      return;
    }
    setHasSwiped(true);
    assert(messages.length);
    // COmmented out just for testing.
    await Promise.resolve();
    // await modifyMessages(messages, addLabelIds, removeLabelIds);
  }

  async function swipeLeft(): Promise<void> {
    console.log('swipeLeft');
    await handleSwipe([], ['INBOX']);
  }

  function swipeUp(): void {
    console.log('swipe up');
  }

  function swipeDown(): void {
    console.log('swipe down');
  }

  async function swipeRight(): Promise<void> {
    console.log('swipe right');
    const [keep, emptyDaily] = await Promise.all([
      Labels.getOrCreateLabel(LabelName.keep),
      Labels.getOrCreateLabel(LabelName.emptyDaily),
    ]);
    await handleSwipe([keep.getId(), emptyDaily.getId()], []);
  }

  const handleGesture = (e: PanGestureHandlerGestureEvent): void => {
    // x/y are absolute coordinates.
    // translationX/translationY are amount moved from the initial pointer down.
    // How are absoluteX/absoluteY different from x/y?
    const x = e.nativeEvent.translationX;
    const y = e.nativeEvent.translationY;
    let direction = panningDirection.current;
    if (direction === PanningDirection.default) {
      if (Math.abs(x) < MIN_PAN_FOR_DRAG && Math.abs(y) < MIN_PAN_FOR_DRAG) {
        return;
      }
      direction = x > y ? PanningDirection.horizontal : PanningDirection.vertical;
      panningDirection.current = direction;
    }
    const isHorizontal = direction === PanningDirection.horizontal;
    const newOffset = { x: isHorizontal ? x : 0, y: isHorizontal ? 0 : y };
    console.log(direction, newOffset);
    pan.setOffset(newOffset);
  };

  const handleGestureStateChange = async (evt: GestureHandlerStateChangeEvent): Promise<void> => {
    const nativeEvent = (evt.nativeEvent as unknown) as GestureHandlerGestureEventNativeEvent &
      PanGestureHandlerEventExtra;
    if (evt.nativeEvent.state === State.END) {
      const isHorizontal = panningDirection.current === PanningDirection.horizontal;
      panningDirection.current = PanningDirection.default;
      pan.flattenOffset();

      // TODO: Should we have different min pan for vertical and horizontal?
      const offset = isHorizontal ? nativeEvent.translationX : nativeEvent.translationY;
      if (Math.abs(offset) < MIN_PAN_FOR_ACTION) {
        Animated.spring(pan, {
          ...SPRING_CONFIG,
          toValue: { x: 0, y: 0 },
          velocity: isHorizontal ? nativeEvent.velocityX : nativeEvent.velocityY,
          useNativeDriver: true,
        }).start();
      } else {
        // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
        assert(messages.length, 'Have not loaded message data yet.');

        const destinationOffset = {
          x: isHorizontal ? Math.sign(nativeEvent.translationX) * WINDOW_WIDTH * 1.1 : 0,
          y: isHorizontal ? 0 : Math.sign(nativeEvent.translationY) * WINDOW_HEIGHT * 1.1,
        };
        Animated.spring(pan, {
          ...SPRING_CONFIG,
          toValue: destinationOffset,
          velocity: isHorizontal ? nativeEvent.velocityX : nativeEvent.velocityY,
          useNativeDriver: true,
        }).start((finished) => {
          if (finished) {
            props.onCardOffScreen({ removeThreadId: props.thread.id() });
          }
        });
        if (offset < -MIN_PAN_FOR_ACTION) {
          await (isHorizontal ? swipeLeft() : swipeUp());
        } else if (offset > MIN_PAN_FOR_ACTION) {
          await (isHorizontal ? swipeRight() : swipeDown());
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
        ...pan.getTranslateTransform(),
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
    },
    horizontal: {
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    vertical: {
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    top: {
      top: -VERTICAL_TOOLBAR_OFFSET,
    },
    right: {
      right: -TOOLBAR_OFFSET,
    },
    bottom: {
      bottom: -VERTICAL_TOOLBAR_OFFSET,
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
          <View style={[style.toolbar, style.top, style.vertical]}>
            <View style={style.toolbarButton}>
              <Text style={style.buttonText}>pin</Text>
            </View>
          </View>
          <View style={[style.toolbar, style.right, style.horizontal]}>
            <View style={style.toolbarButton}>
              <Text style={style.buttonText}>archive</Text>
            </View>
          </View>
          <View style={[style.toolbar, style.bottom, style.vertical]}>
            <View style={style.toolbarButton}>
              <Text style={style.buttonText}>mute</Text>
            </View>
          </View>
          <View style={[style.toolbar, style.left, style.horizontal]}>
            <View style={style.toolbarButton}>
              <Text style={style.buttonText}>{LabelName.emptyDaily.split('/')[2]}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}
