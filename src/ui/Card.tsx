import React, {useEffect, useState, useCallback} from 'react';
import {StyleSheet, Text, Dimensions, View} from 'react-native';
import {PanGestureHandler, State} from 'react-native-gesture-handler';
import {Thread} from '../Thread';
import Animated, {
  cond,
  eq,
  useValue,
  block,
  or,
  startClock,
  stopClock,
  clockRunning,
  set,
  Clock,
  multiply,
  divide,
  abs,
  greaterThan,
  call,
  not,
} from 'react-native-reanimated';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {assert} from '../Base';
import {Message} from '../Message';
import {UpdateThreadListAction, ThreadActions} from './App';
import {MessageComponent} from './MessageComponent';

interface CardProps {
  thread: Thread;
  actions: ThreadActions;
  onCardOffScreen: React.Dispatch<UpdateThreadListAction>;
  preventRenderMessages: boolean;
}

const MIN_PAN_FOR_ACTION = 100;
const TOOLBAR_OFFSET = 75;
const WINDOW_WIDTH = Dimensions.get('window').width + TOOLBAR_OFFSET;

enum CurrentAction {
  None = 0,
  Swiping,
}

function randomSign(): number {
  return Math.random() > 0.5 ? 1 : -1;
}

export function Card(props: CardProps): JSX.Element {
  const [messages, setMessages] = useState([] as Message[]);
  const [
    firstAndLastMessageContents,
    setFirstAndLastMessageContents,
  ] = useState([] as Message[]);

  // Take the swipe action immediately when the user lifts their finger in
  // parallel with swiping the card offscreen.
  const [hasSwiped, setHasSwiped] = useState(false);

  async function swipeLeft(): Promise<void> {
    if (hasSwiped) {
      return;
    }
    setHasSwiped(true);
    assert(messages.length);
    await props.actions.archive(messages);
  }

  async function swipeRight(): Promise<void> {
    if (hasSwiped) {
      return;
    }
    setHasSwiped(true);
    assert(messages.length);
    await props.actions.keep(messages);
  }

  function useAnimation(
    panX: Animated.Value<number>,
    velX: Animated.Adaptable<number>,
    clock: Animated.Clock,
    dragState: Animated.Value<number>,
  ): Animated.Node<number> {
    const currentAction = Animated.useValue(CurrentAction.None);

    const springState = {
      finished: useValue(0),
      velocity: useValue(0),
      position: useValue(0),
      time: useValue(0),
    };

    const config = {
      toValue: new Animated.Value(0),
      damping: 10,
      mass: 0.4,
      stiffness: 50,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    };

    return block([
      cond(or(eq(dragState, State.BEGAN), eq(dragState, State.ACTIVE)), [
        // Dragging.
        set(currentAction, CurrentAction.None),
        stopClock(clock),
      ]),
      cond(
        eq(dragState, State.END),
        // Releasing.
        [
          [
            cond(
              greaterThan(abs(panX), MIN_PAN_FOR_ACTION),
              // Swiping.
              [
                set(
                  config.toValue,
                  multiply(divide(panX, abs(panX)), WINDOW_WIDTH),
                ),
                [set(currentAction, CurrentAction.Swiping)],
                cond(
                  greaterThan(panX, 0),
                  call([], swipeRight),
                  call([], swipeLeft),
                ),
              ],
              // Releasing without a swipe.
              [set(config.toValue, 0)],
            ),
            cond(
              not(clockRunning(clock)),
              // Start spring animation.
              [
                set(springState.finished, 0),
                set(springState.time, 0),
                set(springState.position, panX),
                set(springState.velocity, velX),
                startClock(clock),
              ],
            ),
          ],
          // TODO: This animation takes ~1.5s to finish after the card is
          // already offscreen. Figure out how to abort early rather than
          // waiting for the spring to settle.
          cond(springState.finished, [
            // Finished spring animation.
            cond(eq(currentAction, CurrentAction.Swiping), [
              call([], () =>
                props.onCardOffScreen({removeThreadId: props.thread.id}),
              ),
            ]),
            set(currentAction, CurrentAction.None),
            stopClock(clock),
          ]),
          Animated.spring(clock, springState, config),
          springState.position,
        ],
        [panX],
      ),
    ]);
  }

  const [xOffset] = useState(4 * randomSign() * Math.random());
  const panX = Animated.useValue(0 + xOffset);
  const velocityX = Animated.useValue(0);
  const panState = Animated.useValue(State.UNDETERMINED);
  const [clock] = useState(new Clock());
  const panDrawX = useAnimation(panX, velocityX, clock, panState);

  const onCardOffScreen = useCallback(props.onCardOffScreen, []);

  // TODO - remove useEffect
  useEffect(() => {
    setMessages(props.thread.messages);
    setFirstAndLastMessageContents(props.thread.messages);
  }, [props.thread, onCardOffScreen]);

  const handleGesture = Animated.event(
    [
      {
        nativeEvent: {
          translationX: panX,
          velocityX: velocityX,
          state: panState,
        },
      },
    ],
    {
      useNativeDriver: true,
    },
  );

  const [angleOffset] = useState(randomSign() * Math.random());
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
          rotate: `${angleOffset}deg`,
        },
        // @ts-expect-error StyleSheet.create type doesn't like getting an
        // Animated.Node<number> instead of a plain number.
        {translateX: panDrawX},
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

  const subject = firstAndLastMessageContents.length ? (
    <Text style={style.subject}>{firstAndLastMessageContents[0].subject}</Text>
  ) : undefined;

  let messageComponents;
  if (!props.preventRenderMessages && firstAndLastMessageContents.length) {
    messageComponents = firstAndLastMessageContents.map((x) => (
      <MessageComponent key={x.id} message={x} />
    ));
    if (messages.length > 1) {
      const elidedMessageCount = messages.length - 2;
      // Need to use a view because borders on only one side don't work on Text.
      const divider = (
        <View key="messageCount" style={style.elidedMessageCount}>
          <Text>
            {elidedMessageCount > 0
              ? `${elidedMessageCount} more message${
                  elidedMessageCount > 1 && 's'
                }`
              : ' '}
          </Text>
        </View>
      );
      messageComponents.splice(1, 0, divider);
    }
  }

  return (
    <PanGestureHandler
      enabled={firstAndLastMessageContents.length > 0}
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGesture}>
      {/* @ts-ignore the type doesn't allow position:absolute...the type seems to be wrong. */}
      <Animated.View style={style.card}>
        <View style={style.visibleCard}>
          {subject}
          {messageComponents}
          <View style={[style.toolbar, style.right]}>
            <View style={style.toolbarButton}>
              <Text>archive</Text>
            </View>
          </View>
          <View style={[style.toolbar, style.left]}>
            <View style={style.toolbarButton}>
              <Text>keep</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}
