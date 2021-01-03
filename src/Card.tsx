import React from 'react';
import { Text, View, Animated, PanResponder } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

interface CardProps {
    snippet: string,
}

// Animated example here: https://snack.expo.io/?&iframeId=u1guni3npf&preview=true&platform=web&supportedPlatforms=ios,android,web&name=Animated&description=Example%20usage&theme=light&waitForData=true.

export class Card extends React.Component<CardProps> {
    pan = new Animated.ValueXY();
    panResponder = PanResponder.create({
        onMoveShouldSetPanResponder: () => {
            return true;
        },
        onPanResponderMove: Animated.event([
            null,
            { dx: this.pan.x, dy: this.pan.y }
        ], {
            useNativeDriver: false // https://stackoverflow.com/questions/45363416/usenativedriver-with-panresponder
        }),
        onPanResponderRelease: () => {
            Animated.spring(this.pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true
            }).start();
        }
    });
    render() {
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
            transform: [{ translateX: this.pan.x }, { translateY: this.pan.y }]
        };

        return <Animated.View style={cardStyle} {...this.panResponder.panHandlers}>
            <Text>{this.props.snippet}</Text>
        </Animated.View>;
    }
}
