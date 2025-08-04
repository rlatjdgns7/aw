// Simplified IconSymbol component without MaterialIcons dependency

import { OpaqueColorValue, type StyleProp, type TextStyle, Text } from 'react-native';

// Simplified type definitions
export type IconSymbolName = 'house.fill' | 'paperplane.fill' | 'chevron.left.forwardslash.chevron.right' | 'chevron.right';

/**
 * Simple icon mapping to text symbols
 */
const SYMBOL_MAPPING = {
  'house.fill': '🏠',
  'paperplane.fill': '✈️',
  'chevron.left.forwardslash.chevron.right': '</>', 
  'chevron.right': '>',
};

/**
 * A simplified icon component that uses text symbols instead of vector icons
 * This avoids MaterialIcons dependency issues
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: any; // Keep for compatibility
}) {
  return (
    <Text style={[{ fontSize: size, color }, style]}>
      {SYMBOL_MAPPING[name] || '•'}
    </Text>
  );
}
