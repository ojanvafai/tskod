import React from 'react';
import { Text, View, Animated, Dimensions } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import  {PanGestureHandler} from 'react-native-gesture-handler'


interface CardProps {
    snippet: string,
}

export class Card extends React.Component<CardProps> {
    pan = new Animated.ValueXY();

    handleGesture = Animated.event([{ nativeEvent: { translationX: this.pan.x, translationY: this.pan.y} }], {
        useNativeDriver: true,
    });

    //handleGesture = (evt : any) => {console.log(evt.nativeEvent)}
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
            transform: [{ translateX: this.pan.x}, {translateY: this.pan.y }]
        };

        return <PanGestureHandler onGestureEvent={this.handleGesture}>
            <Animated.View style={cardStyle}>
                <Text>{this.props.snippet}</Text>
            </Animated.View>
        </PanGestureHandler>;
    }
}
