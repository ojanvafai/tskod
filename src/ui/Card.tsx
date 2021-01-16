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
import {assertNotReached, defined} from '../Base';

import {fetchMessageIdsAndLabels, fetchMessagesById} from '../Gapi';
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
const TOOLBAR_OFFSET = 75;
const WINDOW_WIDTH = Dimensions.get('window').width + TOOLBAR_OFFSET;

// TODO - make an enum of what the current action is, so that
//when the spring animation ends, we can call the appropriate method.
enum CurrentAction {
  None = 0,
  SwipingRight,
  SwipingLeft,
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

  const [xOffset] = useState(4 * randomSign() * Math.random());
  const panX = Animated.useValue(0 + xOffset);
  const velocityX = Animated.useValue(0);
  const panState = Animated.useValue(State.UNDETERMINED);
  const [clock] = useState(new Clock());
  const panDrawX = useAnimation(panX, velocityX, clock, panState);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async (): Promise<void> => {
      const messageIds = (await fetchMessageIdsAndLabels(props.threadId))
        .messages;
      if (messageIds !== undefined) {
        setMessages(messageIds.map((x) => new Message(x)));
        const messageIdsToFetch = [defined(messageIds[0].id)];
        if (messageIds.length > 1) {
          messageIdsToFetch.push(defined(messageIds[messageIds.length - 1].id));
        }
        const messageContentsData = await fetchMessagesById(messageIdsToFetch);
        setFirstAndLastMessageContents(
          messageContentsData.map((x) => new Message(x)),
        );
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

  const [angleOffset] = useState(randomSign() * Math.random());
  const cardStyle = StyleSheet.create({
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

  const cardStyleAnimated = {
    card: {
      transform: [
        {
          rotate: `${angleOffset}deg`,
        },
        {translateX: panDrawX},
      ],
    },
  };

  const subject = messages.length ? (
    <Text style={cardStyle.subject}>{messages[0].subject}</Text>
  ) : undefined;

  let messageComponents;
  if (!props.preventRenderMessages && firstAndLastMessageContents.length) {
    messageComponents = [
      <MessageComponent
        key={firstAndLastMessageContents[0].id}
        message={firstAndLastMessageContents[0]}
      />,
    ];
    if (messages.length > 1) {
      if (messages.length > 2) {
        const elidedMessageCount = messages.length - 2;
        messageComponents.push(
          <View key="messageCount" style={cardStyle.elidedMessageCount}>
            <Text>
              {elidedMessageCount} more message{elidedMessageCount > 1 && 's'}
            </Text>
          </View>,
        );
      }
      const lastMessage = firstAndLastMessageContents[1];
      messageComponents.push(
        <MessageComponent key={lastMessage.id} message={lastMessage} />,
      );
    }
  }

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGesture}>
      {/* @ts-ignore the type doesn't allow position:absolute...the type seems to be wrong. */}
      <Animated.View style={[cardStyle.card, cardStyleAnimated.card]}>
        <View style={cardStyle.visibleCard}>
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
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}
