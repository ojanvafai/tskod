import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, Dimensions, View} from 'react-native';
import {PanGestureHandler, State} from 'react-native-gesture-handler';
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
import {assertNotReached} from '../Base';

import {fetchMessages} from '../Gapi';
import {Message} from '../Message';
import {UpdateThreadListAction, ThreadActions} from './App';
import {MessageComponent} from './MessageComponent';

interface CardProps {
  threadId: string;
  actions: ThreadActions;
  cardSwipedAway: React.Dispatch<UpdateThreadListAction>;
  preventRenderMessages: boolean;
}

const MIN_PAN_FOR_ACTION = 100;
const WINDOW_WIDTH = Dimensions.get('window').width;

// TODO - make an enum of what the current action is, so that
//when the spring animation ends, we can call the appropriate method.
enum CurrentAction {
  None = 0,
  SwipingRight,
  SwipingLeft,
}

export function Card(props: CardProps): JSX.Element {
  const [messages, setMessages] = useState([] as Message[]);

  async function swipeLeft(): Promise<void> {
    console.log('swipeLeft');
    if (!messages.length) {
      // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
      assertNotReached('Have not loaded message data yet.');
    }
    props.cardSwipedAway({removeThreadId: props.threadId});
    await props.actions.archive(messages);
  }

  async function swipeRight(): Promise<void> {
    console.log('swipeRight');

    if (!messages.length) {
      // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
      assertNotReached('Have not loaded message data yet.');
    }
    props.cardSwipedAway({removeThreadId: props.threadId});
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
                cond(
                  greaterThan(panX, 0),
                  [set(currentAction, CurrentAction.SwipingRight)],
                  [set(currentAction, CurrentAction.SwipingLeft)],
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
          cond(springState.finished, [
            // Finished spring animation.
            cond(eq(currentAction, CurrentAction.SwipingLeft), [
              call([], swipeLeft),
            ]),
            cond(eq(currentAction, CurrentAction.SwipingRight), [
              call([], swipeRight),
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

  const panX = Animated.useValue(0);
  const velocityX = Animated.useValue(0);
  const panState = Animated.useValue(State.UNDETERMINED);
  const [clock] = useState(new Clock());
  const panDrawX = useAnimation(panX, velocityX, clock, panState);

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
    toolbar: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    right: {
      right: -75,
    },
    left: {
      left: -75,
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
  });

  const cardStyleAnimated = {
    card: {
      transform: [{translateX: panDrawX}],
    },
  };

  // Since we're only showing one screen worth of messages, run render the most recent ones.
  const numMessageToRender = 3;

  const subject = messages.length ? (
    <Text style={cardStyle.subject}>{messages[0].subject}</Text>
  ) : undefined;
  const messageComponents =
    !props.preventRenderMessages &&
    messages
      .slice(messages.length - numMessageToRender)
      .map((x) => <MessageComponent key={x.id} message={x} />);

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGesture}>
      {/* @ts-ignore the type doesn't allow position:absolute...the type seems to be wrong. */}
      <Animated.View style={[cardStyle.card, cardStyleAnimated.card]}>
        {subject}
        {messageComponents}
        <View style={[cardStyle.toolbar, cardStyle.right]}>
          <View style={cardStyle.toolbarButton}>
            <Text>archive</Text>
          </View>
        </View>
        <View style={[cardStyle.toolbar, cardStyle.left]}>
          <View style={cardStyle.toolbarButton}>
            <Text>keep</Text>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}
