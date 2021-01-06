import React, { useState, useEffect } from 'react';
import { Text, Animated } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { PanGestureHandler, State } from 'react-native-gesture-handler'
import { archiveMessages, fetchMessages } from './Gapi';


interface CardProps {
    snippet: string,
    threadId: string,
}

function assertNotReached(message?: string) {
    assert(false, message);
}

function assert(predicate: any, message?: string) {
    if (!predicate) {
        throw new Error(message ?? 'This should never happen.')
    }
}

function defined(variable: any) {
    assert(variable !== undefined);
    return variable;
}

export function Card(props: CardProps) {
    let pan = new Animated.ValueXY();

    const [messages, setMessages] = useState([] as gapi.client.gmail.Message[]);

    useEffect(() => {
        (async () => {
            const messageData = await fetchMessages(props.threadId);
            if (messageData.messages !== undefined) {
                setMessages(messageData.messages);
            }
        })();
    }, []);

    let handleGesture = Animated.event([{ nativeEvent: { translationX: pan.x, translationY: pan.y } }], {
        useNativeDriver: true,
    });

    let handleGestureStateChange = async (evt: any) => {
        if (evt.nativeEvent.state == State.END) {
            pan.setValue({ x: 0, y: 0 })
            if (evt.nativeEvent.translationX < -150) {
                if (!messages.length) {
                    // TODO: Make it so that the UI isn't swipeable until we've loaded message data.
                    assertNotReached('Have not loaded message data yet.')
                }
                await archiveMessages(messages.map(x => defined(x.id)));
            } else if (evt.nativeEvent.translationX > 150) {
                console.log("Swipe right")
            }
        }
    }

    let cardStyle = {
        margin: 15,
        padding: 4,
        /*borderWidth: 1, */
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.32,
        shadowRadius: 5.46,
        backgroundColor: Colors.white,
        elevation: 9,
        transform: [{ translateX: pan.x }]
    };

    return <PanGestureHandler onGestureEvent={handleGesture} onHandlerStateChange={handleGestureStateChange}>
        <Animated.View style={cardStyle}>
            <Text>{props.snippet}</Text>
            {messages.length ? messages.map(x => <Text>MessageID: {x.id}</Text>) : undefined}
        </Animated.View>
    </PanGestureHandler>;
}
