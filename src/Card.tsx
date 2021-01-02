import React from 'react';
import { Text, View } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

interface CardProps {
    snippet: string,
}

export class Card extends React.Component<CardProps> {
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
        };
        return <View style={cardStyle}>
            <Text>{this.props.snippet}</Text>
        </View>;
    }
}
